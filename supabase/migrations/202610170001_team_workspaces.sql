-- Dedicated StockedBy project only. No changes to Finpeel or legacy tables.
begin;
create table public.team_workspaces (
  id uuid primary key default gen_random_uuid(), name text not null check (length(name) between 1 and 100),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.team_members (
  workspace_id uuid not null references public.team_workspaces(id), user_id uuid not null references auth.users(id),
  email text not null, role text not null check (role in ('owner','editor','reviewer','viewer')),
  joined_at timestamptz not null default now(), primary key (workspace_id,user_id)
);
create table public.team_projects (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.team_workspaces(id),
  document jsonb not null, version integer not null default 1, created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (jsonb_typeof(document) = 'object' and octet_length(document::text) < 900000)
);
create table public.team_changes (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.team_workspaces(id),
  project_id uuid not null references public.team_projects(id), base_version integer not null,
  request text not null, proposal jsonb not null, status text not null default 'pending' check(status in ('pending','applied','rejected')),
  created_by uuid not null references auth.users(id), decided_by uuid references auth.users(id),
  decision_note text, decided_at timestamptz, created_at timestamptz not null default now()
);
create table public.team_comments (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.team_workspaces(id),
  project_id uuid not null references public.team_projects(id), change_id uuid references public.team_changes(id),
  anchor text not null default 'initiative', body text not null check(length(body) between 1 and 4000),
  created_by uuid not null references auth.users(id), resolved_by uuid references auth.users(id), resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.team_events (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.team_workspaces(id),
  project_id uuid references public.team_projects(id), actor_id uuid not null references auth.users(id),
  message text not null, created_at timestamptz not null default now()
);
create table public.team_invites (
  id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.team_workspaces(id),
  email text not null, role text not null check(role in ('editor','reviewer','viewer')), token_hash text not null unique,
  created_by uuid not null references auth.users(id), expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now()
);
create table public.team_ai_usage (
  workspace_id uuid not null references public.team_workspaces(id), day date not null default current_date,
  requests integer not null default 0, primary key(workspace_id,day)
);
create index on public.team_members(user_id);
create index on public.team_projects(workspace_id);
create index on public.team_changes(workspace_id,created_at desc);
create index on public.team_comments(workspace_id,created_at desc);
create index on public.team_events(workspace_id,created_at desc);
create index on public.team_invites(workspace_id);

create function public.team_role(wid uuid) returns text language sql stable security definer set search_path = '' as $$
  select role from public.team_members where workspace_id = wid and user_id = auth.uid()
$$;
revoke all on function public.team_role(uuid) from public, anon;
grant execute on function public.team_role(uuid) to authenticated;

alter table public.team_workspaces enable row level security;
alter table public.team_members enable row level security;
alter table public.team_projects enable row level security;
alter table public.team_changes enable row level security;
alter table public.team_comments enable row level security;
alter table public.team_events enable row level security;
alter table public.team_invites enable row level security;
alter table public.team_ai_usage enable row level security;
create policy team_read on public.team_workspaces for select to authenticated using (public.team_role(id) is not null);
create policy team_read on public.team_members for select to authenticated using (public.team_role(workspace_id) is not null);
create policy team_read on public.team_projects for select to authenticated using (public.team_role(workspace_id) is not null);
create policy team_read on public.team_changes for select to authenticated using (public.team_role(workspace_id) is not null);
create policy team_read on public.team_comments for select to authenticated using (public.team_role(workspace_id) is not null);
create policy team_read on public.team_events for select to authenticated using (public.team_role(workspace_id) is not null);
create policy team_read on public.team_invites for select to authenticated using (public.team_role(workspace_id) = 'owner');
revoke all on public.team_workspaces, public.team_members, public.team_projects, public.team_changes, public.team_comments, public.team_events, public.team_invites, public.team_ai_usage from anon, authenticated;
grant select on public.team_workspaces, public.team_members, public.team_projects, public.team_changes, public.team_comments, public.team_events to authenticated;
grant select (id,workspace_id,email,role,created_by,expires_at,accepted_at,revoked_at,created_at) on public.team_invites to authenticated;

-- All mutations validate identity/role inside the transaction. The browser and
-- route handlers never use a service-role key. Optimistic locks prevent lost edits.
create function public.team_command(action text, args jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid(); wid uuid; pid uuid; rid uuid; role_name text;
  mail text; token text; result jsonb; doc jsonb; old_doc jsonb; path text[]; patch jsonb;
  pr public.team_projects; cr public.team_changes; inv public.team_invites;
  affected integer; event_message text; proposed_role text; patches jsonb; node jsonb; nodes jsonb;
begin
  if actor is null then raise exception 'Sign in to your workspace.'; end if;
  select lower(email) into mail from auth.users where id = actor and email_confirmed_at is not null;
  if mail is null then raise exception 'Verify your email before joining a workspace.'; end if;
  if action = 'create_workspace' then
    if length(trim(args->>'name')) not between 1 and 100 then raise exception 'Enter a workspace name.'; end if;
    if (select count(*) from public.team_members where user_id=actor and role='owner') >= 5 then raise exception 'Workspace creation limit reached.'; end if;
    insert into public.team_workspaces(name,created_by) values(trim(args->>'name'),actor) returning id into wid;
    insert into public.team_members values(wid,actor,mail,'owner',now());
    insert into public.team_events(workspace_id,actor_id,message) values(wid,actor,'Workspace created');
    return jsonb_build_object('id',wid);
  end if;
  if action = 'accept_invite' then
    select * into inv from public.team_invites where token_hash = encode(sha256(convert_to(args->>'token','UTF8')),'hex') for update;
    if inv.id is null or inv.expires_at < now() or inv.revoked_at is not null or inv.accepted_at is not null then raise exception 'This invitation is invalid, used or expired.'; end if;
    if inv.email <> mail then raise exception 'Sign in with the email address this invitation was issued to.'; end if;
    insert into public.team_members(workspace_id,user_id,email,role) values(inv.workspace_id,actor,mail,inv.role) on conflict do nothing;
    update public.team_invites set accepted_at=now() where id=inv.id;
    insert into public.team_events(workspace_id,actor_id,message) values(inv.workspace_id,actor,'Joined the workspace');
    return jsonb_build_object('id',inv.workspace_id);
  end if;
  wid := (args->>'workspaceId')::uuid;
  -- Lock the membership row while checking it: removal cannot race a write.
  select role into role_name from public.team_members where workspace_id=wid and user_id=actor for share;
  if role_name is null then raise exception 'Workspace membership required.'; end if;
  if action = 'invite' then
    if role_name <> 'owner' then raise exception 'Only the workspace owner can invite teammates.'; end if;
    proposed_role := args->>'role';
    if proposed_role not in ('editor','reviewer','viewer') or proposed_role is null then raise exception 'Choose a supported role.'; end if;
    if length(args->>'email') > 254 or (args->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email.'; end if;
    token := gen_random_uuid()::text || gen_random_uuid()::text;
    insert into public.team_invites(workspace_id,email,role,token_hash,created_by) values(wid,lower(trim(args->>'email')),proposed_role,encode(sha256(convert_to(token,'UTF8')),'hex'),actor);
    event_message := 'Created an invitation for ' || lower(trim(args->>'email'));
    result := jsonb_build_object('token',token);
  elsif action = 'revoke_invite' then
    if role_name <> 'owner' then raise exception 'Owner permission required.'; end if;
    update public.team_invites set revoked_at=now() where id=(args->>'inviteId')::uuid and workspace_id=wid and accepted_at is null;
    event_message := 'Revoked an invitation';
  elsif action = 'remove_member' then
    if role_name <> 'owner' then raise exception 'Owner permission required.'; end if;
    delete from public.team_members where workspace_id=wid and user_id=(args->>'userId')::uuid and role <> 'owner';
    event_message := 'Removed a workspace member';
  elsif action = 'create_project' then
    if role_name not in ('owner','editor') then raise exception 'Editor permission required.'; end if;
    doc := args->'document';
    if jsonb_typeof(doc) <> 'object' or jsonb_typeof(doc->'nodes') <> 'array' or length(doc->>'name') not between 1 and 160 then raise exception 'Invalid initiative.'; end if;
    insert into public.team_projects(workspace_id,document,created_by,updated_by) values(wid,doc,actor,actor) returning id into pid;
    event_message := 'Created initiative: ' || (doc->>'name');
    result := jsonb_build_object('id',pid);
  elsif action = 'save_project' then
    if role_name not in ('owner','editor') then raise exception 'Editor permission required.'; end if;
    pid := (args->>'projectId')::uuid;
    select * into pr from public.team_projects where id=pid and workspace_id=wid for update;
    if pr.id is null then raise exception 'Initiative not found.'; end if;
    if (args->>'version') is null or pr.version <> (args->>'version')::integer then raise exception 'Save conflict: a teammate changed this initiative. Keep your draft and reload the latest version.'; end if;
    doc := args->'document';
    if jsonb_typeof(doc) <> 'object' or jsonb_typeof(doc->'nodes') <> 'array' or length(doc->>'name') not between 1 and 160 then raise exception 'Invalid initiative.'; end if;
    update public.team_projects set document=doc, version=version+1, updated_at=now(), updated_by=actor where id=pid returning version into affected;
    event_message := 'Saved initiative version ' || affected;
    result := jsonb_build_object('version',affected);
  elsif action = 'reserve_ai' then
    if role_name not in ('owner','editor') then raise exception 'Editor permission required.'; end if;
    insert into public.team_ai_usage(workspace_id,day,requests) values(wid,current_date,1)
      on conflict(workspace_id,day) do update set requests=public.team_ai_usage.requests+1 where public.team_ai_usage.requests<50 returning requests into affected;
    if affected is null then raise exception 'Your team has used today''s 50 AI reviews. Try again tomorrow.'; end if;
    return jsonb_build_object('remaining',50-affected);
  elsif action = 'propose' then
    if role_name not in ('owner','editor') then raise exception 'Editor permission required.'; end if;
    pid := (args->>'projectId')::uuid;
    select * into pr from public.team_projects where id=pid and workspace_id=wid for update;
    if pr.id is null then raise exception 'Initiative not found.'; end if;
    if (args->>'version') is null or pr.version <> (args->>'version')::integer then raise exception 'Initiative changed since analysis began. Prepare a fresh review.'; end if;
    if length(args->>'request') not between 10 and 4000 or octet_length((args->'proposal')::text)>300000 or jsonb_typeof(args->'proposal'->'patches') <> 'array' then raise exception 'Invalid change request.'; end if;
    insert into public.team_changes(workspace_id,project_id,base_version,request,proposal,created_by) values(wid,pid,pr.version,args->>'request',args->'proposal',actor) returning id into rid;
    event_message := 'Prepared a change review'; result := jsonb_build_object('id',rid);
  elsif action = 'decide' then
    if role_name not in ('owner','reviewer') then raise exception 'Owner or reviewer permission required.'; end if;
    select * into cr from public.team_changes where id=(args->>'changeId')::uuid and workspace_id=wid for update;
    if cr.id is null or cr.status <> 'pending' then raise exception 'This review is no longer pending.'; end if;
    if cr.created_by = actor then raise exception 'The author cannot approve or reject their own proposal. Ask another reviewer.'; end if;
    if args->>'decision' not in ('applied','rejected') or args->>'decision' is null then raise exception 'Choose a review decision.'; end if;
    pid := cr.project_id;
    if args->>'decision' = 'applied' then
      select * into pr from public.team_projects where id=pid and workspace_id=wid for update;
      if pr.version <> cr.base_version then raise exception 'Initiative changed since review began. Prepare a fresh review.'; end if;
      doc := pr.document; old_doc := doc; patches := cr.proposal->'patches';
      if jsonb_typeof(cr.proposal->'questions') is distinct from 'array' or jsonb_array_length(patches) not between 1 and 40 or jsonb_array_length(cr.proposal->'questions') <> 0 then raise exception 'Resolve open questions before applying this proposal.'; end if;
      for patch in select value from jsonb_array_elements(patches) loop
        select array_agg(value order by ord) into path from jsonb_array_elements_text(patch->'path') with ordinality as x(value,ord);
        if not (path=array['brief'] or (path[1]='nodes' and path[2] ~ '^(0|[1-9][0-9]{0,3})$' and path[3]='artifact' and (
          (array_length(path,1)=4 and path[4] in ('summary','content')) or (path[4]='items' and path[5] ~ '^(0|[1-9][0-9]{0,3})$' and (
          (array_length(path,1)=6 and path[6] in ('title','detail')) or (array_length(path,1)=7 and path[6]='acceptanceCriteria' and path[7] ~ '^(0|[1-9][0-9]{0,3})$')))))) is true then raise exception 'Unsupported change target.'; end if;
        if jsonb_typeof(patch->'before') is distinct from 'string' or jsonb_typeof(patch->'after') is distinct from 'string' or doc #> path is distinct from patch->'before' then raise exception 'Change conflict: the target no longer matches.'; end if;
        doc := jsonb_set(doc,path,patch->'after',false);
      end loop;
      nodes := '[]'::jsonb;
      for node in select value from jsonb_array_elements(doc->'nodes') loop
        if jsonb_typeof(node->'artifact')='object' then node:=jsonb_set(node,'{artifact,status}','"stale"'); node:=jsonb_set(node,'{artifact,approval}','null'); end if;
        nodes:=nodes || jsonb_build_array(node);
      end loop;
      doc:=jsonb_set(doc,'{nodes}',nodes);
      doc:=jsonb_set(doc,'{updatedAt}',to_jsonb(now()));
      update public.team_projects set document=doc,version=version+1,updated_at=now(),updated_by=actor where id=pid;
    end if;
    update public.team_changes set status=args->>'decision',decided_by=actor,decision_note=left(coalesce(args->>'note',''),4000),decided_at=now() where id=cr.id;
    event_message := case when args->>'decision'='applied' then 'Approved and applied a change proposal' else 'Requested a revised change proposal' end;
  elsif action = 'comment' then
    if role_name='viewer' then raise exception 'Contributor permission required.'; end if;
    pid := (args->>'projectId')::uuid;
    if not exists(select 1 from public.team_projects where id=pid and workspace_id=wid) then raise exception 'Initiative not found.'; end if;
    rid := nullif(args->>'changeId','')::uuid;
    if rid is not null and not exists(select 1 from public.team_changes where id=rid and project_id=pid and workspace_id=wid) then raise exception 'Review not found.'; end if;
    if length(trim(args->>'body')) not between 1 and 4000 then raise exception 'Write a comment of up to 4,000 characters.'; end if;
    insert into public.team_comments(workspace_id,project_id,change_id,anchor,body,created_by) values(wid,pid,rid,left(coalesce(args->>'anchor','initiative'),200),trim(args->>'body'),actor);
    event_message := 'Added a discussion comment';
  elsif action = 'resolve_comment' then
    if role_name='viewer' then raise exception 'Contributor permission required.'; end if;
    update public.team_comments set resolved_by=actor,resolved_at=now() where id=(args->>'commentId')::uuid and workspace_id=wid returning project_id into pid;
    event_message := 'Resolved a discussion';
  else raise exception 'Unsupported workspace action.';
  end if;
  insert into public.team_events(workspace_id,project_id,actor_id,message) values(wid,pid,actor,event_message);
  return coalesce(result,'{}'::jsonb);
end;
$$;
revoke all on function public.team_command(text,jsonb) from public, anon;
grant execute on function public.team_command(text,jsonb) to authenticated;
commit;

-- Private portfolios, initially invitation-only. No portfolio data or credentials in this migration.
create table if not exists public.terminal_members(email text primary key, enabled boolean not null default true, created_at timestamptz not null default now());
alter table public.terminal_members enable row level security;
revoke all on public.terminal_members from anon,authenticated;
insert into public.terminal_members(email) values('rahulkanotra1101@gmail.com') on conflict do nothing;
create or replace function public.terminal_allowed() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from auth.users u join public.terminal_members m on m.email=lower(u.email) where u.id=auth.uid() and u.email_confirmed_at is not null and m.enabled)
$$;
revoke all on function public.terminal_allowed() from public;
grant execute on function public.terminal_allowed() to authenticated;

create or replace function public.terminal_login_allowed(address text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from terminal_members where email=lower(trim(address)) and enabled) $$;
revoke all on function public.terminal_login_allowed(text) from public;
grant execute on function public.terminal_login_allowed(text) to anon,authenticated;

create table if not exists public.terminal_portfolios (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  document jsonb not null default '{"positions":[],"settings":{"currency":"AED"}}',
  version integer not null default 1, updated_at timestamptz not null default now(),
  check(octet_length(document::text)<1500000)
);
create table if not exists public.terminal_cache (
  owner_id uuid not null references auth.users(id) on delete cascade,
  key text not null, data jsonb not null, updated_at timestamptz not null default now(),
  primary key(owner_id,key), check(octet_length(data::text)<2000000)
);
create table if not exists public.terminal_runs (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  run_key text not null, kind text not null, status text not null default 'running',
  lease uuid not null default gen_random_uuid(), expires_at timestamptz not null default now()+interval '5 minutes',
  started_at timestamptz not null default now(), finished_at timestamptz, result jsonb,
  unique(owner_id,run_key), check(status in ('running','complete','partial','failed','interrupted')),
  check(octet_length(result::text)<2000000)
);
create table if not exists public.terminal_alerts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  event_key text not null, data jsonb not null, created_at timestamptz not null default now(), read_at timestamptz,
  unique(owner_id,event_key)
);
create table if not exists public.terminal_job_config (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null, enabled boolean not null default true
);
alter table public.terminal_portfolios enable row level security;
alter table public.terminal_cache enable row level security;
alter table public.terminal_runs enable row level security;
alter table public.terminal_alerts enable row level security;
alter table public.terminal_job_config enable row level security;
revoke all on public.terminal_portfolios,public.terminal_cache,public.terminal_runs,public.terminal_alerts,public.terminal_job_config from anon,authenticated;
grant select on public.terminal_portfolios,public.terminal_cache,public.terminal_runs,public.terminal_alerts to authenticated;
create policy terminal_portfolio_read on public.terminal_portfolios for select to authenticated using(owner_id=auth.uid() and public.terminal_allowed());
create policy terminal_cache_read on public.terminal_cache for select to authenticated using(owner_id=auth.uid() and public.terminal_allowed());
create policy terminal_runs_read on public.terminal_runs for select to authenticated using(owner_id=auth.uid() and public.terminal_allowed());
create policy terminal_alerts_read on public.terminal_alerts for select to authenticated using(owner_id=auth.uid() and public.terminal_allowed());

-- All mutation goes through this bounded internal dispatcher; never executable by a client role.
create or replace function public.terminal_action(who uuid, action text, args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare p terminal_portfolios; r terminal_runs; item jsonb; result jsonb;
begin
  if not exists(select 1 from auth.users u join terminal_members m on m.email=lower(u.email) where u.id=who and u.email_confirmed_at is not null and m.enabled) then raise exception 'Portfolio access required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('terminal:'||who::text,0));
  insert into terminal_portfolios(owner_id) values(who) on conflict do nothing;
  if action='load' then
    select * into p from terminal_portfolios where owner_id=who;
    return jsonb_build_object('document',p.document,'version',p.version,'updatedAt',p.updated_at,
      'cache',coalesce((select jsonb_object_agg(key,data) from terminal_cache where owner_id=who),'{}'::jsonb),
      'runs',coalesce((select jsonb_agg(to_jsonb(t)-'lease'-'owner_id') from (select * from terminal_runs where owner_id=who order by started_at desc limit 40)t),'[]'::jsonb),
      'alerts',coalesce((select jsonb_agg(to_jsonb(t)-'owner_id') from (select * from terminal_alerts where owner_id=who order by created_at desc limit 100)t),'[]'::jsonb),
      'scheduled',exists(select 1 from terminal_job_config where owner_id=who and enabled));
  elsif action='save' then
    if jsonb_typeof(args->'document'->'positions') is distinct from 'array' or jsonb_array_length(args->'document'->'positions')>500 then raise exception 'Invalid portfolio'; end if;
    update terminal_portfolios set document=args->'document',version=version+1,updated_at=now() where owner_id=who and version=(args->>'version')::integer returning * into p;
    if p.owner_id is null then raise exception 'Version conflict. Reload before saving.'; end if;
    return jsonb_build_object('version',p.version,'updatedAt',p.updated_at);
  elsif action='cache' then
    delete from terminal_cache where owner_id=who and key like 'research:%' and updated_at<now()-interval '14 days';
    if length(args->>'key')>160 then raise exception 'Invalid cache key'; end if;
    insert into terminal_cache(owner_id,key,data) values(who,args->>'key',args->'data') on conflict(owner_id,key) do update set data=excluded.data,updated_at=now();
    return '{"ok":true}';
  elsif action='begin' then
    select * into r from terminal_runs where owner_id=who and run_key=args->>'key';
    if r.id is not null then return jsonb_build_object('existing',true,'id',r.id,'status',r.status,'result',r.result); end if;
    update terminal_runs set status='interrupted',finished_at=now(),result='{"errors":["Run interrupted before completion. Retry manually."]}' where owner_id=who and status='running' and expires_at<now();
    if exists(select 1 from terminal_runs where owner_id=who and status='running') then raise exception 'Another scan is running. Please wait.'; end if;
    if (select count(*) from terminal_runs where owner_id=who and started_at>date_trunc('day',now()) and kind<>'refresh')>=12 and args->>'kind'<>'refresh' then raise exception 'Daily research limit reached (12 runs).'; end if;
    if (select count(*) from terminal_runs where owner_id=who and started_at>now()-interval '1 hour')>=30 then raise exception 'Refresh limit reached. Try later.'; end if;
    insert into terminal_runs(owner_id,run_key,kind) values(who,left(args->>'key',160),left(args->>'kind',40)) returning * into r;
    return jsonb_build_object('id',r.id,'lease',r.lease,'existing',false);
  elsif action='finish' then
    update terminal_runs set status=args->>'status',result=args->'result',finished_at=now() where owner_id=who and id=(args->>'id')::uuid and lease=(args->>'lease')::uuid and status='running' and expires_at>now() returning * into r;
    if r.id is null then raise exception 'Run lease expired'; end if;
    for item in select value from jsonb_array_elements(coalesce(args->'alerts','[]'::jsonb)) loop
      insert into terminal_alerts(owner_id,event_key,data) values(who,left(item->>'key',240),item->'data') on conflict(owner_id,event_key) do nothing;
    end loop;
    return '{"ok":true}';
  elsif action='read_alerts' then
    update terminal_alerts set read_at=now() where owner_id=who and read_at is null; return '{"ok":true}';
  elsif action='schedule' then
    perform pg_advisory_xact_lock(hashtextextended('terminal:schedule-capacity',0));
    if coalesce((args->>'enabled')::boolean,false) and (select count(*) from terminal_job_config where enabled and owner_id<>who)>=3 then raise exception 'Scheduled pilot capacity reached (3 accounts). Manual scans remain available.'; end if;
    if args->>'hash' !~ '^[a-f0-9]{64}$' then raise exception 'Invalid job configuration'; end if;
    insert into terminal_job_config(owner_id,token_hash,enabled) values(who,args->>'hash',coalesce((args->>'enabled')::boolean,false)) on conflict(owner_id) do update set token_hash=excluded.token_hash,enabled=excluded.enabled;
    return '{"ok":true}';
  elsif action='invite' then
    if not exists(select 1 from auth.users where id=who and lower(email)='rahulkanotra1101@gmail.com') then raise exception 'Owner access required'; end if;
    if length(args->>'email')>254 or args->>'email' !~ '^[^ @]+@[^ @]+\.[^ @]+$' then raise exception 'Invalid email'; end if;
    insert into terminal_members(email,enabled) values(lower(args->>'email'),true) on conflict(email) do update set enabled=true;
    return '{"ok":true}';
  end if;
  raise exception 'Unsupported terminal action';
end $$;
revoke all on function public.terminal_action(uuid,text,jsonb) from public,anon,authenticated;

create or replace function public.terminal_command(action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if not public.terminal_allowed() then raise exception 'Owner access required'; end if;
  return public.terminal_action(auth.uid(),action,args);
end $$;
revoke all on function public.terminal_command(text,jsonb) from public,anon;
grant execute on function public.terminal_command(text,jsonb) to authenticated;

-- Scoped scheduler credential: can scan the one configured owner, never edit holdings or enable itself.
create or replace function public.terminal_job(token text,action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare who uuid;
begin
  if length(token)<40 or action not in ('owners','load','cache','begin','finish') then raise exception 'Job access denied'; end if;
  if action='owners' then
    if not exists(select 1 from terminal_job_config where enabled and token_hash=encode(sha256(convert_to(token,'UTF8')),'hex')) then raise exception 'Job access denied'; end if;
    return coalesce((select jsonb_agg(jsonb_build_object('id',c.owner_id,'personalFeed',lower(u.email)='rahulkanotra1101@gmail.com')) from terminal_job_config c join auth.users u on u.id=c.owner_id join terminal_members m on m.email=lower(u.email) where c.enabled and m.enabled and u.email_confirmed_at is not null and c.token_hash=encode(sha256(convert_to(token,'UTF8')),'hex')),'[]'::jsonb);
  end if;
  select owner_id into who from terminal_job_config where owner_id=(args->>'ownerId')::uuid and enabled and token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') limit 1;
  if who is null then raise exception 'Job access denied'; end if;
  return public.terminal_action(who,action,args);
end $$;
revoke all on function public.terminal_job(text,text,jsonb) from public;
grant execute on function public.terminal_job(text,text,jsonb) to anon;

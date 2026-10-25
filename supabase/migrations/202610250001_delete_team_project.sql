begin;
-- Owner-confirmed deletion of one version of one project. No table write grants.
create or replace function public.team_delete_project(args jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  wid uuid := (args->>'workspaceId')::uuid;
  pid uuid := (args->>'projectId')::uuid;
  role_name text;
  project_row public.team_projects;
begin
  if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null) then
    raise exception 'Verified sign-in required';
  end if;
  select role into role_name from public.team_members where workspace_id=wid and user_id=actor for share;
  if role_name is distinct from 'owner' then raise exception 'Only a workspace owner can delete projects'; end if;
  -- Review decisions lock a change before its project. Use that order here too.
  perform 1 from public.team_changes where project_id=pid and workspace_id=wid order by id for update;
  select * into project_row from public.team_projects where id=pid and workspace_id=wid for update;
  if not found then raise exception 'Project not found. Refresh your workspace'; end if;
  if (args->>'version')::integer is distinct from project_row.version then
    raise exception 'Version conflict: this project changed since you opened the confirmation. Refresh and review it before deleting';
  end if;
  delete from public.team_comments where project_id=pid;
  delete from public.team_changes where project_id=pid;
  delete from public.team_events where project_id=pid;
  delete from public.team_projects where id=pid;
  insert into public.team_events(workspace_id,actor_id,message)
    values(wid,actor,'Deleted project “' || left(project_row.document->>'name',160) || '”.');
  return jsonb_build_object('id',pid);
end;
$$;
revoke all on function public.team_delete_project(jsonb) from public, anon;
grant execute on function public.team_delete_project(jsonb) to authenticated;

-- Lets the app roll out safely before/after this migration without a broken button.
create or replace function public.team_delete_project_available()
returns boolean language sql stable set search_path = '' as $$ select true $$;
revoke all on function public.team_delete_project_available() from public, anon;
grant execute on function public.team_delete_project_available() to authenticated;
commit;

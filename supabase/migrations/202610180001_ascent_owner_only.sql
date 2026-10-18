-- Ascent remains a private, single-owner product until an explicit public launch.
-- No team policies, user accounts or existing sessions are deleted or changed.
begin;
create or replace function public.ascent_allowed() returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists (
    select 1 from public.ascent_members m
    join auth.users u on u.id=m.user_id
    where m.user_id=auth.uid() and m.enabled
      and lower(u.email)='rahulkanotra1101@gmail.com'
      and u.email_confirmed_at is not null
  )
$$;
revoke all on function public.ascent_allowed() from public;
grant execute on function public.ascent_allowed() to authenticated;
commit;

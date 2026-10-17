-- Additive, private ASCENT schema. Existing team tables are not changed.
begin;
create table public.ascent_members(user_id uuid primary key references auth.users(id) on delete cascade, enabled boolean not null default true);
alter table public.ascent_members enable row level security;
create policy ascent_member_self on public.ascent_members for select to authenticated using(user_id=auth.uid());
grant select on public.ascent_members to authenticated;
create function public.ascent_allowed() returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.ascent_members where user_id=auth.uid() and enabled) $$;
revoke all on function public.ascent_allowed() from public;
grant execute on function public.ascent_allowed() to authenticated;
create table public.ascent_sessions(
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in('scenario','story','interview','recording','reflection')),
 title text not null, prompt text not null, answer text not null default '', audience text not null,
 target_seconds integer not null check(target_seconds in(45,60,90,180)), parent_id uuid references public.ascent_sessions(id) on delete set null,
 relation text, context jsonb not null default '{}', rubric_version text not null,
 status text not null check(status in('uploading','queued','processing','transcribing','reviewing','ready','failed','deleting')),
 review jsonb, transcript jsonb, metrics jsonb, notes jsonb not null default '[]', usage jsonb,
 media_path text, mime text, bytes bigint, sha256 text,
 attempts integer not null default 0, lease_token uuid, lease_until timestamptz, error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(length(answer)<=12000 and length(prompt)<=6000 and length(title)<=180),
 check(bytes is null or bytes between 32 and 52428800)
);
create index ascent_sessions_owner_date on public.ascent_sessions(user_id,created_at desc);
create unique index ascent_media_hash on public.ascent_sessions(user_id,sha256) where sha256 is not null;
alter table public.ascent_sessions enable row level security;
create policy ascent_sessions_self on public.ascent_sessions for select to authenticated using(user_id=auth.uid() and public.ascent_allowed());
grant select on public.ascent_sessions to authenticated;
create table public.ascent_settings(user_id uuid primary key references auth.users(id) on delete cascade,version integer not null default 1,roadmap jsonb not null default '[]',updated_at timestamptz not null default now());
alter table public.ascent_settings enable row level security;
create policy ascent_settings_self on public.ascent_settings for select to authenticated using(user_id=auth.uid() and public.ascent_allowed());
grant select on public.ascent_settings to authenticated;
create table public.ascent_checkins(user_id uuid references auth.users(id) on delete cascade,day date not null,habits jsonb not null default '[]',reflection text not null default '',primary key(user_id,day),check(length(reflection)<=6000));
alter table public.ascent_checkins enable row level security;
create policy ascent_checkins_self on public.ascent_checkins for select to authenticated using(user_id=auth.uid() and public.ascent_allowed());
grant select on public.ascent_checkins to authenticated;
create table public.ascent_usage(user_id uuid references auth.users(id) on delete cascade,day date not null default current_date,reviews integer not null default 0,media integer not null default 0,primary key(user_id,day));
alter table public.ascent_usage enable row level security;
-- All writes use a bounded command. No direct table writes, even for members.
revoke insert,update,delete on public.ascent_members,public.ascent_sessions,public.ascent_settings,public.ascent_checkins,public.ascent_usage from anon,authenticated;
create function public.ascent_action(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); s public.ascent_sessions%rowtype; quota public.ascent_usage%rowtype; token uuid; current_version integer; amount bigint;
begin
 if uid is null or not public.ascent_allowed() then raise exception 'Private studio access required'; end if;
 if octet_length(args::text)>120000 then raise exception 'Request is too large'; end if;
 if action='create' then
  perform pg_advisory_xact_lock(hashtextextended(uid::text,2));
  select * into s from public.ascent_sessions where user_id=uid and id=(args->>'id')::uuid;
  if found then return to_jsonb(s); end if;
  if nullif(args->>'sha256','') is not null then
   select * into s from public.ascent_sessions where user_id=uid and sha256=args->>'sha256';
   if found then return to_jsonb(s); end if;
  end if;
  if (select count(*) from public.ascent_sessions where user_id=uid)>=1000 then raise exception 'Library limit reached. Export and remove older sessions.'; end if;
  if args->>'kind' not in('scenario','story','interview','reflection','recording') then raise exception 'Invalid training mode'; end if;
  if args->>'kind'<>'recording' and length(coalesce(args->>'answer',''))<30 then raise exception 'Add a response first'; end if;
  if nullif(args->>'parent_id','') is not null and not exists(select 1 from public.ascent_sessions where id=(args->>'parent_id')::uuid and user_id=uid and status='ready') then raise exception 'Parent session is not available'; end if;
  if args->>'kind'='recording' then
   if coalesce(args->>'sha256','') !~ '^[a-f0-9]{64}$' or coalesce(args->>'extension','') not in('mov','mp4','m4a','wav','mp3','webm') then raise exception 'Invalid recording metadata'; end if;
   select coalesce(sum(bytes),0) into amount from public.ascent_sessions where user_id=uid;
   if amount+(args->>'bytes')::bigint>524288000 then raise exception 'Private media storage limit is 500 MB. Remove a recording before uploading another.'; end if;
  end if;
  insert into public.ascent_sessions(id,user_id,kind,title,prompt,answer,audience,target_seconds,parent_id,relation,context,rubric_version,status,media_path,mime,bytes,sha256)
  values((args->>'id')::uuid,uid,args->>'kind',left(args->>'title',180),left(args->>'prompt',6000),coalesce(args->>'answer',''),left(args->>'audience',120),(args->>'target_seconds')::integer,nullif(args->>'parent_id','')::uuid,args->>'relation',coalesce(args->'context','{}'),args->>'rubric_version',case when args->>'kind'='recording' then 'uploading' else 'queued' end,
   case when args->>'kind'='recording' then uid::text||'/'||(args->>'id')||'.'||(args->>'extension') else null end,args->>'mime',nullif(args->>'bytes','')::bigint,args->>'sha256') returning * into s;
  return to_jsonb(s);
 elsif action='settings' then
  if jsonb_typeof(args->'roadmap')<>'array' or jsonb_array_length(args->'roadmap')>20 then raise exception 'Use up to 20 roadmap milestones'; end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,3));
  select version into current_version from public.ascent_settings where user_id=uid for update;
  if coalesce(current_version,0)<>coalesce((args->>'version')::integer,-1) then raise exception 'Roadmap changed on another device. Reload before saving.'; end if;
  insert into public.ascent_settings(user_id,version,roadmap) values(uid,1,args->'roadmap') on conflict(user_id) do update set version=ascent_settings.version+1,roadmap=excluded.roadmap,updated_at=now();
  return (select to_jsonb(x) from public.ascent_settings x where user_id=uid);
 elsif action='checkin' then
  if jsonb_typeof(args->'habits')<>'array' or jsonb_array_length(args->'habits')>6 then raise exception 'Invalid check-in'; end if;
  if (args->>'day')::date<current_date-365 or (args->>'day')::date>current_date+1 then raise exception 'Choose a recent date'; end if;
  insert into public.ascent_checkins(user_id,day,habits,reflection) values(uid,(args->>'day')::date,args->'habits',coalesce(args->>'reflection','')) on conflict(user_id,day) do update set habits=excluded.habits,reflection=excluded.reflection;
  return jsonb_build_object('ok',true);
 elsif action='delete_checkin' then
  delete from public.ascent_checkins where user_id=uid and day=(args->>'day')::date; return jsonb_build_object('ok',true);
 end if;
 select * into s from public.ascent_sessions where id=(args->>'id')::uuid and user_id=uid for update;
 if not found then raise exception 'Session is not available'; end if;
 if action='uploaded' then
  if s.status='uploading' then update public.ascent_sessions set status='queued',updated_at=now() where id=s.id returning * into s; end if;
 elsif action='claim' then
  if s.status in('ready','deleting','uploading') or (s.lease_until is not null and s.lease_until>now()) then return null; end if;
  if s.attempts>=3 then raise exception 'Three attempts were unsuccessful. Export your answer and start a new session.'; end if;
  insert into public.ascent_usage(user_id,day) values(uid,current_date) on conflict do nothing;
  select * into quota from public.ascent_usage where user_id=uid and day=current_date for update;
  if quota.reviews>=30 or (s.kind='recording' and quota.media>=10) then raise exception 'Daily limit reached: 30 reviews and 10 recordings. Try tomorrow.'; end if;
  if exists(select 1 from public.ascent_sessions where user_id=uid and id<>s.id and lease_until>now()) then raise exception 'Another session is processing. Let it finish before starting this one.'; end if;
  update public.ascent_usage set reviews=reviews+1,media=media+case when s.kind='recording' then 1 else 0 end where user_id=uid and day=current_date;
  token=gen_random_uuid();
  update public.ascent_sessions set status='processing',lease_token=token,lease_until=now()+interval '5 minutes',attempts=attempts+1,error=null,updated_at=now() where id=s.id returning * into s;
 elsif action='job' then
  if s.lease_token is null or s.lease_token is distinct from (args->>'token')::uuid or s.status='deleting' then return null; end if;
  if args->>'status' not in('processing','transcribing','reviewing','ready','failed') then raise exception 'Invalid processing state'; end if;
  update public.ascent_sessions set status=args->>'status',review=coalesce(args->'review',review),transcript=coalesce(args->'transcript',transcript),metrics=coalesce(args->'metrics',metrics),usage=coalesce(args->'usage',usage),error=left(args->>'error',500),lease_token=case when args->>'status' in('ready','failed') then null else lease_token end,lease_until=case when args->>'status' in('ready','failed') then null else lease_until end,updated_at=now() where id=s.id returning * into s;
 elsif action='notes' then
  if jsonb_typeof(args->'notes')<>'array' or jsonb_array_length(args->'notes')>100 then raise exception 'Use up to 100 notes'; end if;
  update public.ascent_sessions set notes=args->'notes',updated_at=now() where id=s.id returning * into s;
 elsif action='delete' then
  update public.ascent_sessions set status='deleting',lease_token=null,lease_until=null,updated_at=now() where id=s.id returning * into s;
 elsif action='purge' then
  if s.status<>'deleting' then raise exception 'Delete the recording first'; end if;
  delete from public.ascent_sessions where id=s.id; return jsonb_build_object('ok',true);
 else raise exception 'Unknown studio action';
 end if;
 return to_jsonb(s);
end $$;
revoke all on function public.ascent_action(text,jsonb) from public;
grant execute on function public.ascent_action(text,jsonb) to authenticated;
-- Existing verified owner only. No open enrollment or automatic team access.
insert into public.ascent_members(user_id) select id from auth.users where lower(email)='rahulkanotra1101@gmail.com' and email_confirmed_at is not null on conflict do nothing;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ascent-private','ascent-private',false,52428800,array['video/quicktime','video/mp4','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav','audio/mpeg','video/webm','audio/webm']) on conflict(id) do nothing;
create policy ascent_media_read on storage.objects for select to authenticated using(bucket_id='ascent-private' and public.ascent_allowed() and exists(select 1 from public.ascent_sessions s where s.user_id=auth.uid() and s.media_path=name));
create policy ascent_media_write on storage.objects for insert to authenticated with check(bucket_id='ascent-private' and public.ascent_allowed() and exists(select 1 from public.ascent_sessions s where s.user_id=auth.uid() and s.media_path=name and s.status='uploading'));
create policy ascent_media_remove on storage.objects for delete to authenticated using(bucket_id='ascent-private' and public.ascent_allowed() and exists(select 1 from public.ascent_sessions s where s.user_id=auth.uid() and s.media_path=name));
commit;

-- Purchase Check. Additive; requires 0010 and 0011. Browser jobs use a
-- service-role worker, never an anonymous browser-to-database connection.
create table if not exists pc_accounts (
 merchant_id uuid primary key references merchants(id) on delete cascade,
 credits integer not null default 0 check (credits >= 0), created_at timestamptz not null default now()
);
create table if not exists pc_settings (
 id integer primary key default 1 check (id=1), paused boolean not null default true,
 daily_limit integer not null default 20 check (daily_limit between 1 and 200),
 budget_day date, started_today integer not null default 0,
 heartbeat_at timestamptz, updated_at timestamptz not null default now()
);
insert into pc_settings(id) values(1) on conflict do nothing;
create table if not exists pc_stores (
 id uuid primary key default gen_random_uuid(), merchant_id uuid not null references merchants(id) on delete cascade,
 name text not null, origin text not null, verification_token uuid not null default gen_random_uuid(),
 verified_at timestamptz, created_at timestamptz not null default now(), unique(merchant_id,origin)
);
create table if not exists pc_cases (
 id uuid primary key default gen_random_uuid(), merchant_id uuid not null references merchants(id) on delete cascade,
 store_id uuid not null references pc_stores(id) on delete cascade, config jsonb not null,
 version integer not null default 1, weekly boolean not null default false, next_run_at timestamptz,
 schedule_note text, created_at timestamptz not null default now()
);
create table if not exists pc_runs (
 id uuid primary key default gen_random_uuid(), merchant_id uuid not null references merchants(id) on delete cascade,
 case_id uuid not null references pc_cases(id) on delete cascade, store_id uuid not null references pc_stores(id) on delete cascade,
 config jsonb not null, case_version integer not null,
 source text not null check(source in ('manual','retest','scheduled')), parent_run_id uuid references pc_runs(id),
 status text not null default 'queued' check(status in ('queued','running','completed','failed','cancelled')),
 result jsonb, error_code text, lease_token uuid, lease_until timestamptz, attempts integer not null default 0,
 review_status text not null default 'open' check(review_status in ('open','accepted','dismissed')),
 review_note text, reviewed_by uuid references merchants(id), reviewed_at timestamptz,
 created_at timestamptz not null default now(), started_at timestamptz, completed_at timestamptz
);
create unique index if not exists pc_one_active_case on pc_runs(case_id) where status in ('queued','running');
create unique index if not exists pc_one_retest on pc_runs(parent_run_id) where parent_run_id is not null and status not in ('failed','cancelled');
create index if not exists pc_queue on pc_runs(status,created_at);
create index if not exists pc_merchant_history on pc_runs(merchant_id,created_at desc);
create table if not exists pc_artifacts (
 run_id uuid primary key references pc_runs(id) on delete cascade,
 screenshot text not null check(length(screenshot)<=350000), created_at timestamptz not null default now()
);
create table if not exists pc_ledger (
 id uuid primary key default gen_random_uuid(), merchant_id uuid not null references merchants(id) on delete cascade,
 delta integer not null, reason text not null, run_id uuid references pc_runs(id), claim_id uuid references manual_payment_claims(id),
 actor_id uuid references merchants(id), created_at timestamptz not null default now(), unique(run_id,reason), unique(claim_id)
);
alter table manual_payment_claims add column if not exists product text not null default 'agent_storefront' check(product in ('agent_storefront','purchase_check'));
-- Keep old product approvals from silently issuing the wrong entitlement.
create or replace function review_agent_store_payment(claim_id uuid, reviewer uuid, decision text, note text)
returns void language plpgsql security definer set search_path = public as $$
declare claim manual_payment_claims%rowtype;
begin
 perform pg_advisory_xact_lock(721001);
 if decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
 select * into claim from manual_payment_claims where id = claim_id for update;
 if not found then raise exception 'Claim not found'; end if;
 if claim.product <> 'agent_storefront' then raise exception 'Wrong product review'; end if;
 if claim.status <> 'pending' then return; end if;
 if decision = 'approved' then
  insert into agent_store_access(merchant_id,expires_at) values(claim.merchant_id,now()+interval '30 days')
  on conflict(merchant_id) do update set expires_at=greatest(agent_store_access.expires_at,now())+interval '30 days';
 end if;
 update manual_payment_claims set status=decision,reviewed_at=now(),reviewer_id=reviewer,review_note=left(note,500) where id=claim_id;
end; $$;

create or replace function pc_review_payment(p_claim uuid,p_reviewer uuid,p_decision text,p_note text)
returns void language plpgsql security definer set search_path=public as $$
declare c manual_payment_claims%rowtype;
begin
 perform pg_advisory_xact_lock(721001);
 if p_decision not in ('approved','rejected') or length(trim(p_note)) < 3 then raise exception 'Review and note required'; end if;
 select * into c from manual_payment_claims where id=p_claim for update;
 if not found or c.product <> 'purchase_check' then raise exception 'Payment not found'; end if;
 if c.status <> 'pending' then return; end if;
 if p_decision='approved' then
  insert into pc_accounts(merchant_id,credits) values(c.merchant_id,20)
  on conflict(merchant_id) do update set credits=pc_accounts.credits+20;
  insert into pc_ledger(merchant_id,delta,reason,claim_id,actor_id) values(c.merchant_id,20,'payment',c.id,p_reviewer);
 end if;
 update manual_payment_claims set status=p_decision,reviewed_at=now(),reviewer_id=p_reviewer,review_note=left(p_note,500) where id=c.id;
end; $$;

create or replace function pc_grant_credits(p_merchant uuid,p_actor uuid,p_amount integer,p_note text)
returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(721001);
 if p_amount not between 1 and 20 or length(trim(p_note)) < 3 then raise exception 'Enter 1–20 pilot credits and a reason'; end if;
 insert into pc_accounts(merchant_id) values(p_merchant) on conflict do nothing;
 perform 1 from pc_accounts where merchant_id=p_merchant for update;
 if exists(select 1 from pc_ledger where merchant_id=p_merchant and reason like 'pilot:%') then raise exception 'Pilot credits have already been issued'; end if;
 update pc_accounts set credits=credits+p_amount where merchant_id=p_merchant;
 insert into pc_ledger(merchant_id,delta,reason,actor_id) values(p_merchant,p_amount,'pilot:'||left(p_note,300),p_actor);
end; $$;

create or replace function pc_save_store(p_merchant uuid,p_name text,p_origin text)
returns uuid language plpgsql security definer set search_path=public as $$
declare existing uuid; n integer;
begin
 perform pg_advisory_xact_lock(721001);
 insert into pc_accounts(merchant_id) values(p_merchant) on conflict do nothing;
 perform 1 from pc_accounts where merchant_id=p_merchant for update;
 select id into existing from pc_stores where merchant_id=p_merchant and origin=p_origin;
 if found then return existing; end if;
 select count(*) into n from pc_stores where merchant_id=p_merchant;
 if n>=3 then raise exception 'This pilot supports up to three stores'; end if;
 insert into pc_stores(merchant_id,name,origin) values(p_merchant,left(p_name,100),p_origin) returning id into existing;
 return existing;
end; $$;

create or replace function pc_save_case(p_merchant uuid,p_store uuid,p_config jsonb,p_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare saved uuid; n integer;
begin
 perform pg_advisory_xact_lock(721001);
 perform 1 from pc_accounts where merchant_id=p_merchant for update;
 if not exists(select 1 from pc_stores where id=p_store and merchant_id=p_merchant and verified_at is not null) then raise exception 'Verify this store first'; end if;
 if p_id is null then
  select count(*) into n from pc_cases where merchant_id=p_merchant;
  if n>=5 then raise exception 'This pilot supports five saved journeys'; end if;
  insert into pc_cases(merchant_id,store_id,config) values(p_merchant,p_store,p_config) returning id into saved;
 else
  if exists(select 1 from pc_runs where case_id=p_id and status in ('queued','running')) then raise exception 'Wait for the current check before changing its baseline'; end if;
  update pc_cases set config=p_config,version=version+1,weekly=false,next_run_at=null,schedule_note='Baseline changed; review before scheduling.' where id=p_id and merchant_id=p_merchant and store_id=p_store returning id into saved;
  if saved is null then raise exception 'Journey not found'; end if;
 end if;
 return saved;
end; $$;

create or replace function pc_enqueue(p_merchant uuid,p_case uuid,p_parent uuid default null,p_source text default 'manual')
returns uuid language plpgsql security definer set search_path=public as $$
declare c pc_cases%rowtype; rid uuid; balance integer;
begin
 perform pg_advisory_xact_lock(721001);
 if p_source not in ('manual','retest','scheduled') then raise exception 'Invalid run type'; end if;
 select credits into balance from pc_accounts where merchant_id=p_merchant for update;
 select * into c from pc_cases where id=p_case and merchant_id=p_merchant for update;
 if not found then raise exception 'Journey not found'; end if;
 if p_parent is not null then
  if not exists(select 1 from pc_runs where id=p_parent and merchant_id=p_merchant and case_id=c.id and config=c.config and status='completed') then raise exception 'Retest requires the same saved baseline and a completed report'; end if;
  select id into rid from pc_runs where parent_run_id=p_parent and status not in ('failed','cancelled');
  if found then return rid; end if;
 end if;
 select id into rid from pc_runs where case_id=c.id and status in ('queued','running');
 if found then return rid; end if;
 if not exists(select 1 from pc_stores where id=c.store_id and merchant_id=p_merchant and verified_at is not null) then raise exception 'Verify this store first'; end if;
 if balance is null or balance<1 then raise exception 'Add check credits to continue'; end if;
 if (select paused from pc_settings where id=1) then raise exception 'Checks are paused by the operator'; end if;
 insert into pc_runs(merchant_id,case_id,store_id,config,case_version,source,parent_run_id)
 values(p_merchant,c.id,c.store_id,c.config,c.version,p_source,p_parent) returning id into rid;
 update pc_accounts set credits=credits-1 where merchant_id=p_merchant;
 insert into pc_ledger(merchant_id,delta,reason,run_id) values(p_merchant,-1,'check',rid);
 update pc_cases set next_run_at=case when weekly then now()+interval '7 days' else null end where id=c.id;
 return rid;
end; $$;

create or replace function pc_cancel(p_merchant uuid,p_run uuid)
returns void language plpgsql security definer set search_path=public as $$
declare r pc_runs%rowtype;
begin
 perform pg_advisory_xact_lock(721001);
 perform 1 from pc_accounts where merchant_id=p_merchant for update;
 select * into r from pc_runs where id=p_run and merchant_id=p_merchant for update;
 if not found then raise exception 'Check not found'; end if;
 if r.status='cancelled' then return; end if;
 if r.status<>'queued' then raise exception 'Only queued checks can be cancelled'; end if;
 update pc_runs set status='cancelled',completed_at=now() where id=r.id;
 update pc_accounts set credits=credits+1 where merchant_id=p_merchant;
 insert into pc_ledger(merchant_id,delta,reason,run_id) values(p_merchant,1,'refund',r.id);
end; $$;

create or replace function pc_schedule_due()
returns integer language plpgsql security definer set search_path=public as $$
declare c pc_cases%rowtype; n integer:=0;
begin
 perform pg_advisory_xact_lock(721001);
 if not pg_try_advisory_xact_lock(721002) then return 0; end if;
 if (select paused from pc_settings where id=1) then return 0; end if;
 for c in select * from pc_cases where weekly and next_run_at<=now() order by next_run_at limit 20 loop
  begin
 perform pg_advisory_xact_lock(721001);
   perform pc_enqueue(c.merchant_id,c.id,null,'scheduled'); n:=n+1;
  exception when others then
   update pc_cases set weekly=false,next_run_at=null,schedule_note='Scheduling paused. Check credits, verification and the latest report before resuming.' where id=c.id;
  end;
 end loop;
 return n;
end; $$;

create or replace function pc_claim()
returns setof pc_runs language plpgsql security definer set search_path=public as $$
declare s pc_settings%rowtype; r pc_runs%rowtype; n integer;
begin
 perform pg_advisory_xact_lock(721001);
 select * into s from pc_settings where id=1 for update;
 update pc_settings set heartbeat_at=now() where id=1;
 delete from pc_artifacts where created_at<now()-interval '30 days';
 -- A crashed worker gets one retry. Expired leases cannot later overwrite it.
 for r in select * from pc_runs where status='running' and lease_until<now() for update skip locked loop
  if r.attempts>=2 then
   update pc_runs set status='failed',error_code='worker_timeout',completed_at=now(),lease_token=null,lease_until=null where id=r.id;
   update pc_accounts set credits=credits+1 where merchant_id=r.merchant_id;
   insert into pc_ledger(merchant_id,delta,reason,run_id) values(r.merchant_id,1,'refund',r.id) on conflict do nothing;
   update pc_cases set weekly=false,next_run_at=null,schedule_note='Worker could not finish. Credit returned; review before retrying.' where id=r.case_id;
  else
   update pc_runs set status='queued',lease_token=null,lease_until=null where id=r.id;
  end if;
 end loop;
 if s.paused then return; end if;
 n:=case when s.budget_day=(now() at time zone 'UTC')::date then s.started_today else 0 end;
 if n>=s.daily_limit then return; end if;
 select * into r from pc_runs where status='queued' order by created_at for update skip locked limit 1;
 if not found then return; end if;
 update pc_settings set budget_day=(now() at time zone 'UTC')::date,started_today=n+1 where id=1;
 return query update pc_runs set status='running',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '4 minutes',started_at=now() where id=r.id returning *;
end; $$;

create or replace function pc_finish(p_run uuid,p_lease uuid,p_result jsonb,p_error text default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare r pc_runs%rowtype;
begin
 perform pg_advisory_xact_lock(721001);
 select * into r from pc_runs where id=p_run and status='running' and lease_token=p_lease and lease_until>now() for update;
 if not found then return false; end if;
 if p_error is null and (p_result is null or coalesce(p_result->>'verdict','') not in ('pass','issue','unknown') or coalesce(jsonb_typeof(p_result->'checks'),'')<>'array') then raise exception 'Invalid check result'; end if;
 if p_error is null and length(p_result->>'screenshot') between 1 and 350000 then
  insert into pc_artifacts(run_id,screenshot) values(r.id,p_result->>'screenshot');
 end if;
 update pc_runs set status=case when p_error is null then 'completed' else 'failed' end,result=p_result-'screenshot',error_code=p_error,completed_at=now(),lease_token=null,lease_until=null where id=r.id;
 if p_error is not null then
  update pc_accounts set credits=credits+1 where merchant_id=r.merchant_id;
  insert into pc_ledger(merchant_id,delta,reason,run_id) values(r.merchant_id,1,'refund',r.id);
 end if;
 if p_error is not null or p_result->>'verdict'<>'pass' then
  update pc_cases set weekly=false,next_run_at=null,schedule_note='A check needs attention. Review the result, then resume weekly checks when ready.' where id=r.case_id;
 end if;
 return true;
end; $$;

-- All merchant isolation lives in authenticated server handlers. RPCs are
-- deliberately inaccessible to anon/authenticated database roles.
do $$ declare t text; f record; begin
 perform pg_advisory_xact_lock(721001);
 foreach t in array array['pc_accounts','pc_settings','pc_stores','pc_cases','pc_runs','pc_ledger','pc_artifacts'] loop
  execute format('alter table %I enable row level security',t);
  execute format('revoke all on table %I from public, anon, authenticated',t);
  execute format('grant all on table %I to service_role',t);
 end loop;
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'pc\_%' escape '\' loop
  execute format('revoke all on function %s from public, anon, authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;

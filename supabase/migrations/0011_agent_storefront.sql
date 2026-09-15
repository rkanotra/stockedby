-- Agent Storefront: additive. Requires 0010_phase2_commerce_schema.sql.
create table if not exists agent_storefronts (
 id uuid primary key default gen_random_uuid(),
 merchant_id uuid not null unique references merchants(id) on delete cascade,
 draft jsonb not null default '{"name":"","domain":"","delivery":"","returns":"","products":[]}',
 verification_token uuid not null default gen_random_uuid(), verified_domain text,
 published jsonb, published_at timestamptz,
 updated_at timestamptz not null default now()
);
create table if not exists agent_store_versions (
 id uuid primary key default gen_random_uuid(),
 storefront_id uuid not null references agent_storefronts(id) on delete cascade,
 product_count integer not null, catalog jsonb not null, published_at timestamptz not null default now()
);
create table if not exists agent_store_access (
 merchant_id uuid primary key references merchants(id) on delete cascade,
 expires_at timestamptz not null
);
create table if not exists manual_payment_claims (
 id uuid primary key default gen_random_uuid(),
 merchant_id uuid not null references merchants(id) on delete cascade,
 reference text not null unique check (reference ~ '^[0-9]{12}$'),
 amount_inr integer not null check (amount_inr > 0),
 currency text not null default 'INR' check (currency = 'INR'),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz,
 reviewer_id uuid references merchants(id), review_note text
);
create unique index if not exists one_pending_payment_per_merchant on manual_payment_claims(merchant_id) where status = 'pending';
alter table agent_storefronts enable row level security;
alter table agent_store_versions enable row level security;
alter table agent_store_access enable row level security;
alter table manual_payment_claims enable row level security;

-- Only the server service role can approve. One transaction, locked claim:
-- double-clicks and concurrent approvals cannot extend access twice.
create or replace function review_agent_store_payment(claim_id uuid, reviewer uuid, decision text, note text)
returns void language plpgsql security definer set search_path = public as $$
declare claim manual_payment_claims%rowtype;
begin
 if decision not in ('approved','rejected') then raise exception 'Invalid decision'; end if;
 select * into claim from manual_payment_claims where id = claim_id for update;
 if not found then raise exception 'Claim not found'; end if;
 if claim.status <> 'pending' then return; end if;
 if decision = 'approved' then
   insert into agent_store_access(merchant_id, expires_at)
   values (claim.merchant_id, now() + interval '30 days')
   on conflict (merchant_id) do update
   set expires_at = greatest(agent_store_access.expires_at, now()) + interval '30 days';
 end if;
 update manual_payment_claims set status = decision, reviewed_at = now(), reviewer_id = reviewer, review_note = left(note,500) where id = claim_id;
end; $$;
revoke all on function review_agent_store_payment(uuid,uuid,text,text) from public, anon, authenticated;
grant execute on function review_agent_store_payment(uuid,uuid,text,text) to service_role;

-- Publishing and the version log commit together; draft timestamp prevents
-- a tab from publishing older edits over newer ones.
create or replace function publish_agent_store(store_id uuid, owner_id uuid, expected_updated_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare s agent_storefronts%rowtype;
begin
 select * into s from agent_storefronts where id = store_id and merchant_id = owner_id for update;
 if not found or s.updated_at <> expected_updated_at then raise exception 'Reload the latest draft'; end if;
 if s.verified_domain is null or s.verified_domain <> s.draft->>'domain' then raise exception 'Verify store ownership first'; end if;
 if not exists(select 1 from agent_store_access where merchant_id = owner_id and expires_at > now()) then raise exception 'Active access required'; end if;
 update agent_storefronts set published = draft, published_at = now() where id = store_id;
 insert into agent_store_versions(storefront_id,product_count,catalog) values(store_id,jsonb_array_length(s.draft->'products'),s.draft);
end; $$;
revoke all on function publish_agent_store(uuid,uuid,timestamptz) from public, anon, authenticated;
grant execute on function publish_agent_store(uuid,uuid,timestamptz) to service_role;

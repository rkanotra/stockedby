-- StockedBy Phase 2 — merchant accounts + Shopify store connection +
-- catalog ingestion + AI Commerce Readiness Score.
-- Run this once in Supabase's SQL editor (or `supabase db push`).
-- Idempotent: safe to re-run. Purely additive — touches none of the
-- Phase 1/1.5 tables (leads/reports/snapshots/ai_observations/etc). Phase
-- 2's readiness scoring is deliberately self-contained and does NOT read
-- from ai_observations (constraint: "do not depend on live production
-- ai_observations data for core Phase 2 functionality") — a merchant's
-- catalog readiness score is computed purely from their own Shopify
-- product data, independent of whether 0008/0009 have even been applied.
--
-- Eight tables:
--   merchants               — one row per merchant account (email-only;
--                              no password — see lib/auth/magicLink.js).
--   merchant_auth_tokens    — single-use magic-link login tokens, hashed
--                              (never store the raw token, same posture
--                              as merchant_sessions below).
--   merchant_sessions       — server-side session store; the browser only
--                              ever holds an opaque random cookie value,
--                              hashed before it's compared against this
--                              table (lib/auth/session.js).
--   shopify_oauth_states    — short-lived CSRF/state values for the
--                              Shopify OAuth authorization-code flow
--                              (lib/shopify/oauth.js).
--   stores                  — one row per connected Shopify shop.
--                              access_token_encrypted is AES-256-GCM
--                              ciphertext (lib/crypto.js) — never the raw
--                              Shopify access token; TOKEN_ENCRYPTION_KEY
--                              lives only in Vercel env vars, same
--                              "server-side only" posture as every other
--                              secret in this app (hard rule 1).
--   store_products           — normalized product catalog per store.
--   store_product_variants   — normalized variant rows per product.
--   store_readiness_scores   — one row per completed readiness scan, so a
--                              store's score can be tracked over time —
--                              same historical-tracking spirit as Phase
--                              1.5's ai_observations, but a fully separate
--                              table/pipeline (constraint above).

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists merchant_auth_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists merchant_auth_tokens_email_idx on merchant_auth_tokens (email, created_at desc);

create table if not exists merchant_sessions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists merchant_sessions_merchant_idx on merchant_sessions (merchant_id);

create table if not exists shopify_oauth_states (
  id uuid primary key default gen_random_uuid(),
  state text not null unique,
  shop text not null,
  merchant_id uuid not null references merchants (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants (id) on delete cascade,
  platform text not null default 'shopify',
  shop_domain text not null unique,
  access_token_encrypted text not null,
  scope text,
  status text not null default 'active' check (status in ('active', 'uninstalled', 'needs_reconnect')),
  sync_status text not null default 'idle' check (sync_status in ('idle', 'syncing', 'error')),
  last_synced_page_info text,
  last_synced_at timestamptz,
  last_sync_error text,
  installed_at timestamptz not null default now(),
  uninstalled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists stores_merchant_idx on stores (merchant_id);

create table if not exists store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  shopify_product_id text not null,
  title text,
  handle text,
  product_type text,
  vendor text,
  status text,
  raw_json jsonb,
  normalized_json jsonb not null default '{}'::jsonb,
  readiness_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, shopify_product_id)
);
create index if not exists store_products_store_idx on store_products (store_id);

create table if not exists store_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references store_products (id) on delete cascade,
  shopify_variant_id text not null,
  sku text,
  price numeric,
  currency text,
  inventory_quantity int,
  raw_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, shopify_variant_id)
);
create index if not exists store_product_variants_product_idx on store_product_variants (product_id);

create table if not exists store_readiness_scores (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  computed_at timestamptz not null default now(),
  overall_score int not null,
  discoverable_score int,
  readable_score int,
  transactable_score int,
  product_count int not null,
  ready_count int,
  needs_work_count int,
  blocked_count int,
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists store_readiness_scores_store_idx on store_readiness_scores (store_id, computed_at desc);

-- Row Level Security: on by default, zero policies — same posture as
-- every other table in this app (lib/supabaseClient.js only ever talks to
-- Supabase with the service-role key, which bypasses RLS; this just
-- guarantees the anon key, if it ever leaked, grants nothing).
alter table merchants enable row level security;
alter table merchant_auth_tokens enable row level security;
alter table merchant_sessions enable row level security;
alter table shopify_oauth_states enable row level security;
alter table stores enable row level security;
alter table store_products enable row level security;
alter table store_product_variants enable row level security;
alter table store_readiness_scores enable row level security;

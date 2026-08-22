-- StockedBy Phase 4 — persistence + capture + share.
-- Run this once in Supabase's SQL editor (or `supabase db push` if you use
-- the CLI). Idempotent: safe to re-run — every statement is if-not-exists.
--
-- Four tables, matching lib/supabaseClient.js / lib/snapshotCache.js /
-- lib/reports.js / app/api/lead/route.js / app/api/generate-queries/route.js:
--   leads                     — POST /api/lead, the email-gate submission
--   reports                   — one row per completed test, powers /report/[slug]
--   snapshots                 — write-through cache for on-demand chatgpt/gemini
--                                harvests (lib/harvestClients.js), so a category
--                                is harvested once ever, not once per visitor
--   custom_category_requests  — every /api/generate-queries call, so the most-
--                                requested customs can become real bank additions
--
-- Bank JSON files (data/*.json) stay the seed layer and are never written to
-- by the app — this schema holds only the deltas: harvested snapshots,
-- generated reports, captured leads, and custom-category signal.

create extension if not exists pgcrypto;

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  brand text not null,
  brand_domain text,
  painpoint text,
  market text not null,
  category text not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists leads_email_idx on leads (email);
create index if not exists leads_created_at_idx on leads (created_at desc);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  market text not null,
  category_id text,
  brand text not null,
  brand_domain text,
  report_json jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists reports_created_at_idx on reports (created_at desc);

create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  category_id text not null,
  qid text not null,
  engine text not null,
  collected_on date not null,
  snapshot_json jsonb not null,
  created_at timestamptz not null default now(),
  unique (market, category_id, qid, engine, collected_on)
);
-- The lookup app/api/test/route.js actually does: "every snapshot for this
-- market+category, across engines/qids" — a single composite index covers it
-- (leftmost prefix also serves market-only and market+category_id lookups).
create index if not exists snapshots_lookup_idx on snapshots (market, category_id, engine, collected_on desc);

create table if not exists custom_category_requests (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  category_text text not null,
  created_at timestamptz not null default now()
);
create index if not exists custom_category_requests_created_at_idx on custom_category_requests (created_at desc);

-- Row Level Security: on by default for any new Supabase project. This app
-- only ever talks to these tables with the service-role key (server-side
-- only — see lib/supabaseClient.js, hard rule 1), which bypasses RLS
-- entirely, so no policies are defined. Enabling RLS with zero policies is
-- still the correct posture: it guarantees the anon/public key (if it were
-- ever exposed) grants no access at all to these tables.
alter table leads enable row level security;
alter table reports enable row level security;
alter table snapshots enable row level security;
alter table custom_category_requests enable row level security;

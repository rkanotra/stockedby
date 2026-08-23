-- StockedBy Fix Generator (/fix) — extends Phase 4's schema.
-- Run this once in Supabase's SQL editor. Idempotent: safe to re-run.
--
-- Two changes:
--   1. leads gains `source` (default 'report', so every existing
--      report-flow insert keeps working unchanged) and market/category
--      become nullable — a fix-lead has no natural market/category the
--      way a report lead does (it's keyed by domain, not
--      brand+market+category).
--   2. fix_runs — one row per /fix run, keyed by domain. Lets "Verify it
--      worked" and a repeat visit look up what was generated without
--      re-running the whole discovery+extraction pipeline, and backs the
--      one-run-per-domain-per-day limit alongside lib/rateLimit.js's
--      in-memory counter (that counter resets on cold start; this table
--      doesn't, so it's the more durable record of what actually ran).

create table if not exists fix_runs (
  id uuid primary key default gen_random_uuid(),
  domain text not null,
  platform text not null,
  products_json jsonb not null,
  llms_txt text,
  audit_before_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists fix_runs_domain_idx on fix_runs (domain, created_at desc);
alter table fix_runs enable row level security;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'leads' and column_name = 'source'
  ) then
    alter table leads add column source text not null default 'report';
  end if;
end $$;

alter table leads alter column market drop not null;
alter table leads alter column category drop not null;

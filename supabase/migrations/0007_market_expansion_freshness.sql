-- StockedBy market expansion — freshness-signal infrastructure.
-- Run this once in Supabase's SQL editor (or `supabase db push` if you use
-- the CLI). Idempotent: safe to re-run. Not yet applied to the live
-- project, same manual step as every prior migration here.
--
-- Three tables, all read-only signal collection for scripts/
-- refresh_query_bank.py's future refresh loop — none of this auto-publishes
-- anything; a human always reviews before a bank version changes:
--
--   query_edits               — components/test/TestFlow.js's startTest(),
--                                via app/api/test/route.js: a shopper
--                                editing a prefilled question away from its
--                                generated original. Native-speaker
--                                correction data — the highest-value
--                                dialect-drift signal available.
--   failed_category_searches  — components/test/CategoryStep.js's debounced
--                                client trigger, via
--                                app/api/log-failed-search/route.js: a
--                                zero-result category search the user
--                                didn't proceed past (distinct from
--                                custom_category_requests, which only logs
--                                a request the user DID proceed with).
--   autocomplete_pulls        — scripts/autocomplete_pull.py, run manually
--                                monthly: Google autocomplete suggestions
--                                per market's category seed terms, the
--                                external drift detector.

create table if not exists query_edits (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  category text,
  original_text text not null,
  edited_text text not null,
  test_id text,
  created_at timestamptz not null default now()
);
create index if not exists query_edits_market_idx on query_edits (market, created_at desc);

create table if not exists failed_category_searches (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  search_text text not null,
  created_at timestamptz not null default now()
);
create index if not exists failed_category_searches_market_idx on failed_category_searches (market, created_at desc);

create table if not exists autocomplete_pulls (
  id uuid primary key default gen_random_uuid(),
  market text not null,
  seed_term text not null,
  suggestions jsonb not null default '[]'::jsonb,
  pulled_on date not null,
  created_at timestamptz not null default now()
);
create index if not exists autocomplete_pulls_market_idx on autocomplete_pulls (market, pulled_on desc);

alter table query_edits enable row level security;
alter table failed_category_searches enable row level security;
alter table autocomplete_pulls enable row level security;
-- Zero policies, same as every other table (lib/supabaseClient.js only
-- ever talks to Supabase with the service-role key, which bypasses RLS —
-- this just guarantees the anon key, if it ever leaked, grants nothing).

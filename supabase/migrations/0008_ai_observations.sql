-- StockedBy Phase 1 (YC transformation, "Foundation") — the AI observation
-- data model, improved. Run this once in Supabase's SQL editor (or
-- `supabase db push`). Idempotent: safe to re-run. Not yet applied to the
-- live project, same manual step as every prior migration here.
--
-- The gap this closes: `snapshots` (0001) only ever holds chatgpt/gemini
-- harvested rows (Claude is always live per hard rule 6, so its results
-- never landed anywhere structured outside a single test's own
-- `reports.report_json` blob), and `brand_appearances` (0003) is a view
-- over `snapshots` alone — so neither could ever answer "how has this
-- brand's AI visibility changed over time" for the one engine that's
-- always live. `ai_observations` is a normalized, append-only log of every
-- REAL (never "missing"/fabricated) per-question result from every
-- completed test, across all three engines (lib/observations.js's
-- recordObservations(), called from app/api/test/route.js right after
-- saveReport()) — one row per (report, engine, question). It captures, per
-- observation: whether/where the brand appeared, its destination
-- classification (own-site vs marketplace — lib/scoring.js's
-- effectiveDestination(), the same routing-detection logic the report
-- itself already uses, just now persisted per-row instead of only
-- aggregated in report_json), and the top competing brand seen in that
-- same question (competitor-benchmarking signal). This is additive only —
-- `reports`/`snapshots`/`brand_appearances` are all unchanged and still
-- the source of truth for a single test's own numbers; this table exists
-- purely so those numbers can be compared over time and across
-- competitors without re-parsing every historical report_json.

create table if not exists ai_observations (
  id uuid primary key default gen_random_uuid(),
  report_slug text,
  market text not null,
  category_id text,
  brand text not null,
  engine text not null,
  qid text not null,
  archetype text,
  appeared boolean not null,
  rank int,
  destination text,          -- brand-direct | marketplace | aggregator | none | null (brand didn't appear)
  destination_domain text,
  top_competitor text,       -- the first other real brand recommended in this same question, if any
  source text not null,      -- live | live-harvest | snapshot
  observed_on date not null,
  created_at timestamptz not null default now()
);

-- "How has {brand} done in {market}/{category} over time" — the trend
-- card's lookup (lib/observations.js's getVisibilityTrend).
create index if not exists ai_observations_brand_idx on ai_observations (brand, market, category_id, observed_on);
-- "Who's winning this market+category, per engine" — future cross-brand
-- competitor benchmarking (scripts/founder_digest.py-style ad-hoc queries).
create index if not exists ai_observations_market_idx on ai_observations (market, category_id, engine, observed_on desc);
-- Back-reference from a single report to its own logged observations.
create index if not exists ai_observations_report_idx on ai_observations (report_slug);

alter table ai_observations enable row level security;
-- Zero policies, same as every other table (lib/supabaseClient.js only
-- ever talks to Supabase with the service-role key, which bypasses RLS —
-- this just guarantees the anon key, if it ever leaked, grants nothing).

-- Per-day aggregate over ai_observations: appearance rate, average rank
-- (when appeared), and the own-site/marketplace routing split — "none" and
-- non-appearances excluded from the routing-split base, same convention as
-- lib/founderReport.js's buildDestinationSplit(). One row per
-- brand+market+category+day actually tested; there is deliberately no
-- interpolation for days with no test — a gap in the trend just means no
-- test ran that day, never a fabricated flat line.
create or replace view brand_visibility_trend as
select
  brand,
  market,
  category_id,
  observed_on,
  round(100.0 * count(*) filter (where appeared) / nullif(count(*), 0), 1) as appearance_rate,
  round(avg(rank) filter (where appeared), 1) as avg_rank,
  round(
    100.0 * count(*) filter (where destination = 'brand-direct')
    / nullif(count(*) filter (where destination is not null and destination <> 'none'), 0),
    1
  ) as own_site_pct,
  round(
    100.0 * count(*) filter (where destination in ('marketplace', 'aggregator'))
    / nullif(count(*) filter (where destination is not null and destination <> 'none'), 0),
    1
  ) as marketplace_pct
from ai_observations
group by brand, market, category_id, observed_on
order by brand, market, category_id, observed_on;

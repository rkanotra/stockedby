-- StockedBy self-improvement infrastructure — observability + the founder
-- digest. Run this once in Supabase's SQL editor. Idempotent: safe to re-run.
--
-- Two pieces:
--   1. system_events — one row per real failure worth knowing about: a live
--      query that errored, a "recommendations" response that failed the
--      sanity check (empty/garbage), or a JSON parse failure. Written by
--      lib/systemEvents.js (app/api/test/query, app/api/generate-queries)
--      and scripts/harvest.py / scripts/retest.py's own log_event(). Feeds
--      scripts/founder_digest.py's "system-event patterns" section.
--   2. brand_appearances — a view over snapshots.snapshot_json's
--      recommendations array, per (brand, category, market, engine): how
--      often that brand shows up and its average rank when it does. Brand
--      names are matched exactly as stored (no fuzzy normalization at the
--      SQL layer — lib/scoring.js's normalize()/matches() do that in the
--      app; this view is a raw aggregate for the digest and ad-hoc queries,
--      not a replacement for the app's own brand-matching logic).

create table if not exists system_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null, -- 'query_failure' | 'sanity_rejection' | 'parse_failure'
  source text not null,     -- 'test' | 'generate-queries' | 'harvest' | 'retest'
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists system_events_type_idx on system_events (event_type, created_at desc);
create index if not exists system_events_created_at_idx on system_events (created_at desc);
alter table system_events enable row level security;

create or replace view brand_appearances as
with recs as (
  select
    s.market,
    s.category_id,
    s.engine,
    s.qid,
    s.collected_on,
    rec ->> 'brand' as brand,
    nullif(rec ->> 'rank', '')::int as rank
  from snapshots s
  cross join lateral jsonb_array_elements(coalesce(s.snapshot_json -> 'recommendations', '[]'::jsonb)) as rec
  where coalesce(rec ->> 'brand', '') <> ''
),
totals as (
  select market, category_id, engine, count(distinct (qid, collected_on)) as total_snapshots
  from snapshots
  group by market, category_id, engine
)
select
  r.brand,
  r.category_id as category,
  r.market,
  r.engine,
  round(avg(r.rank)::numeric, 1) as avg_position,
  round(count(distinct (r.qid, r.collected_on))::numeric / nullif(t.total_snapshots, 0), 3) as appearance_rate
from recs r
join totals t
  on t.market = r.market and t.category_id = r.category_id and t.engine = r.engine
group by r.brand, r.category_id, r.market, r.engine, t.total_snapshots
order by r.market, r.category_id, r.engine, avg_position;

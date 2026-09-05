-- StockedBy Phase 1.5 — "Observation Layer Hardening."
-- Run this once in Supabase's SQL editor (or `supabase db push`), AFTER
-- 0008_ai_observations.sql. Idempotent: safe to re-run.
--
-- Why a new migration instead of editing 0008: this repo's own practice
-- (0001..0007) has never edited a shipped migration file — every change so
-- far always added a new numbered one, even for small additions (0006 for
-- one nullable column). 0008 was written in this same session and almost
-- certainly hasn't been applied to production yet, but "almost certainly"
-- isn't "certainly" — so this migration is written defensively, safe to
-- run whether 0008's table is empty (the expected case) or already holds
-- rows from an early deploy.
--
-- What changes, and why (see lib/observations.js for the code side):
--
--   1. TEST TIME vs SOURCE OBSERVATION TIME, split into two real columns.
--      0008 had a single `observed_on` date with no distinction between
--      "when the report ran" and "when the underlying AI answer was
--      actually obtained" — so a chatgpt/gemini result read from a 2-day-
--      old cached snapshot would have looked exactly as fresh as Claude's
--      live call in the same report. `test_run_at` is always "now, when
--      this report ran"; `source_observed_at` is the real timestamp of the
--      underlying AI response (same as test_run_at for a live/harvested
--      call this request made; the snapshot's own collected_on, at
--      day-granularity, for a cached read). `observed_on` becomes a
--      GENERATED column derived from source_observed_at, so it can never
--      drift out of sync with it again.
--   2. Provenance: source_type/collection_method/snapshot_id/model_name/
--      model_version.
--   3. Stable query identity: question_text/question_hash/language.
--   4. Fuller destination + competitor detail: destination_url (reserved,
--      see comment below)/marketplace_name/top_competitor_domain/
--      top_competitor_rank/competitor_destination/recommended_count/
--      brand_domain.
--   5. Idempotency: a unique index on (report_slug, engine, qid,
--      source_observed_at) — lib/observations.js's recordObservations()
--      upserts against it with ignoreDuplicates, so re-logging the same
--      report_slug's observations is a safe no-op, never a duplicate row.

alter table ai_observations
  add column if not exists test_run_at timestamptz,
  add column if not exists source_observed_at timestamptz,
  add column if not exists source_type text,
  add column if not exists collection_method text,
  add column if not exists snapshot_id text,
  add column if not exists model_name text,
  add column if not exists model_version text,
  add column if not exists question_text text,
  add column if not exists question_hash text,
  add column if not exists language text,
  add column if not exists brand_domain text,
  -- Reserved for a future pipeline change: the AI extraction prompt
  -- (lib/claudeClient.js, lib/harvestClients.js) only ever asks for a
  -- destination_domain, never a full URL — so this column exists for the
  -- long-term commerce graph's sake but is deliberately always null today.
  -- Do not backfill it with a guessed URL built from destination_domain;
  -- that would be fabrication (hard rule 2), not real evidence.
  add column if not exists destination_url text,
  add column if not exists marketplace_name text,
  add column if not exists top_competitor_domain text,
  add column if not exists top_competitor_rank int,
  add column if not exists competitor_destination text,
  add column if not exists recommended_count int;

-- Defensive backfill for the (expected-empty, but not assumed-empty) case
-- that 0008 already shipped and collected real rows before this migration
-- ran: best-defensible reconstruction from what 0008 already recorded,
-- explicitly marked as such rather than silently passed off as more
-- precise than it is.
update ai_observations
set
  test_run_at = coalesce(test_run_at, created_at),
  source_observed_at = coalesce(source_observed_at, (observed_on::timestamptz)),
  source_type = coalesce(
    source_type,
    case source
      when 'live' then 'live'
      when 'live-harvest' then 'harvested'
      when 'snapshot' then 'cache'
      else 'backfill'
    end
  )
where test_run_at is null or source_observed_at is null or source_type is null;

alter table ai_observations
  alter column test_run_at set not null,
  alter column source_observed_at set not null,
  alter column source_type set not null;

alter table ai_observations
  drop constraint if exists ai_observations_source_type_check;
alter table ai_observations
  add constraint ai_observations_source_type_check
  check (source_type in ('live', 'cache', 'harvested', 'backfill'));

-- observed_on is now DERIVED from source_observed_at (never independently
-- settable, never able to drift from it) — dropping the old plain column
-- also drops its old index; both are recreated below against
-- source_observed_at directly.
alter table ai_observations drop column if exists observed_on;
alter table ai_observations
  add column observed_on date generated always as (source_observed_at::date) stored;

-- Indexes for the access patterns this hardening pass actually needs
-- (point 14): brand/market/category trend lookups, market/category+engine
-- benchmarking, a single report's own logged rows, per-engine ad-hoc
-- queries, and question-identity lookups. Deliberately no index on
-- brand_domain/snapshot_id/model_name alone — nothing queries by those in
-- isolation yet, and an unused index is pure write-cost.
create index if not exists ai_observations_brand_idx
  on ai_observations (brand, market, category_id, source_observed_at);
create index if not exists ai_observations_market_idx
  on ai_observations (market, category_id, engine, source_observed_at desc);
create index if not exists ai_observations_engine_idx
  on ai_observations (engine);
create index if not exists ai_observations_question_hash_idx
  on ai_observations (question_hash);
-- ai_observations_report_idx (report_slug) already exists from 0008.

-- Idempotency: report_slug/engine/qid/source_observed_at together identify
-- "this exact observation from this exact report" — a standard (non-
-- partial) unique index, so multiple NULL report_slug rows (a report save
-- that failed, per lib/reports.js's own best-effort posture) never
-- conflict with each other or anything else; Postgres never treats NULL as
-- equal to NULL for uniqueness. lib/observations.js's recordObservations()
-- upserts against this exact column list with ignoreDuplicates: true.
create unique index if not exists ai_observations_dedupe_idx
  on ai_observations (report_slug, engine, qid, source_observed_at);

-- ---------------------------------------------------------------------
-- brand_visibility_trend — the metric definition, spelled out precisely
-- because "StockedBy must be able to explain exactly what a trend number
-- means" (Phase 1.5 brief):
--
--   Grouping key: (brand, market, category_id, source_observed_at::date)
--     — one point per REAL day this brand+market+category had at least one
--     observation. A day nothing was tested has no row at all — never a
--     fabricated 0%.
--
--   Deduping unit (distinct_obs CTE below): (brand, market, category_id,
--     engine, qid, source_observed_at). If the SAME underlying AI answer
--     (a still-fresh cached chatgpt/gemini snapshot, or a bank-seed
--     snapshot) was read by more than one report for this same brand on
--     the same day — e.g. a merchant re-testing before their category's
--     snapshot went stale — it is collapsed to ONE observation before
--     aggregating, not counted once per report. Without this, a brand that
--     simply re-tested more often would look artificially more "visible"
--     without the underlying AI answer having changed at all (this is
--     what requirement #4/#9 call "reusing a cached snapshot must not
--     falsely create multiple independent historical observations").
--     Claude's own live rows are naturally exempt from ever colliding here
--     in practice: each fresh live call gets a new source_observed_at down
--     to the second, so two genuinely separate live runs are always two
--     distinct rows.
--
--   observation_count: the real count of distinct observations
--     contributing to that day — the honest denominator. NOT a fixed
--     "3 engines x N questions" assumption; a day where only Claude ran
--     (chatgpt/gemini both still "missing", never logged at all — see
--     lib/observations.js) simply has a smaller denominator, never one
--     padded with invented zeros for the engines that weren't there.
--
--   distinct_engines: how many of the (up to 3) engines actually
--     contributed to that day's numbers — lets a caller distinguish "42%
--     appearance rate, but that's only Claude" from "42% across all 3."
--
--   appearance_rate / avg_rank / own_site_pct / marketplace_pct: same
--     definitions as lib/founderReport.js's buildBuyerJourney /
--     buildDestinationSplit (own_site_pct/marketplace_pct exclude "none"
--     and non-appearances from their base, same as that file), just
--     computed per day instead of per report.
create or replace view brand_visibility_trend as
with distinct_obs as (
  select distinct on (brand, market, category_id, engine, qid, source_observed_at)
    brand, market, category_id, engine, qid, source_observed_at, appeared, rank, destination
  from ai_observations
  order by brand, market, category_id, engine, qid, source_observed_at
)
select
  brand,
  market,
  category_id,
  source_observed_at::date as observed_on,
  count(*) as observation_count,
  count(distinct engine) as distinct_engines,
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
from distinct_obs
group by brand, market, category_id, source_observed_at::date
order by brand, market, category_id, observed_on;

-- ---------------------------------------------------------------------
-- ai_observations_diagnostic — the founder-facing data-quality check
-- (Phase 1.5 point 12): one row, queryable directly in Supabase's SQL
-- editor (`select * from ai_observations_diagnostic;`) or via
-- app/api/admin/observations-diagnostic (a thin, ADMIN_TOKEN-protected
-- JSON wrapper around this same view — see that route's own comment).
-- "Duplicate attempts prevented" isn't derivable from this table alone
-- (a skipped duplicate is never stored) — that count comes from
-- system_events's 'observations_dedup' rows instead (lib/observations.js
-- logs one whenever recordObservations() actually skips a duplicate),
-- summed separately below.
create or replace view ai_observations_diagnostic as
select
  (select count(*) from ai_observations) as total_observations,
  (select jsonb_object_agg(engine, n) from (
     select engine, count(*) as n from ai_observations group by engine
   ) t) as observations_by_engine,
  (select jsonb_object_agg(source_type, n) from (
     select source_type, count(*) as n from ai_observations group by source_type
   ) t) as observations_by_source_type,
  (select count(distinct snapshot_id) from ai_observations where snapshot_id is not null) as unique_snapshot_ids,
  (select coalesce(sum((context->>'skipped')::int), 0)
     from system_events where event_type = 'observations_dedup') as duplicate_attempts_prevented,
  (select count(*) from ai_observations where destination is null) as missing_destination,
  (select count(*) from ai_observations where appeared and rank is null) as missing_rank,
  (select min(source_observed_at) from ai_observations) as oldest_observation,
  (select max(source_observed_at) from ai_observations) as newest_observation;

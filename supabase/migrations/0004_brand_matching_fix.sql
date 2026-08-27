-- StockedBy brand-matching correctness fix. Run this once in Supabase's
-- SQL editor. Idempotent: safe to re-run.
--
-- Root cause (see CLAUDE.md / commit history): the old brand-comparison
-- util stripped "&" and all whitespace with nothing put back, so "Dot &
-- Key" normalized to "dotkey" while a slug/guess-derived "Dot and Key"
-- normalized to "dotandkey" — neither is a substring of the other, so the
-- match silently failed and the brand scored zero (a real production bug:
-- a brand ranked #1 with 3 mentions in its own leaders list while its
-- verdict read NOT STOCKED, 0 of 3). lib/scoring.js's normalizeBrand()
-- fixes the comparison itself; this migration adds the explicit,
-- separate display-name/slug fields and the contradiction-guard's
-- severity column.

-- 1. Explicit, separate display-name/slug fields on `reports` — additive
-- (existing `brand` and `category_id` columns are untouched and keep
-- working exactly as before; `brand` already IS the display name, never a
-- slug). Nullable and backfilled from those existing columns for rows that
-- predate this migration; lib/reports.js populates all four going forward.
alter table reports add column if not exists brand_display_name text;
alter table reports add column if not exists brand_slug text;
alter table reports add column if not exists category_display_name text;
alter table reports add column if not exists category_slug text;

update reports set brand_display_name = brand where brand_display_name is null;
update reports set category_slug = category_id where category_slug is null and category_id is not null;
-- category_display_name has no existing top-level source to backfill from
-- (the real name only ever lived inside report_json.category.name) — left
-- null for pre-migration rows; scripts/audit_brand_matches.py reads
-- report_json directly so this doesn't block the audit.

-- 2. Contradiction guard (app/api/test/route.js): severity on
-- system_events, so a "brand appears in its own leaders list but verdict
-- is NOT STOCKED" event is distinguishable from routine query/parse
-- failures at a glance, not just buried in `context`.
alter table system_events add column if not exists severity text not null default 'info';
create index if not exists system_events_severity_idx on system_events (severity, created_at desc);

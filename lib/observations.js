import { createHash } from "node:crypto";
import { supabase } from "./supabaseClient.js";
import { ENGINE_ORDER, matches, effectiveDestination, normalizeDomain, marketplaceLabelForDomain } from "./scoring.js";
import { CLAUDE_MODEL } from "./claudeClient.js";
import { HARVEST_MODELS } from "./harvestClients.js";
import { logSystemEvent } from "./systemEvents.js";

// Structured, historical AI-observation log (Phase 1 "Foundation", hardened
// in Phase 1.5 — see supabase/migrations/0008_ai_observations.sql /
// 0009_ai_observations_hardening.sql for the full rationale): one row per
// (engine, question) real result from a completed test, across all three
// engines — not just the chatgpt/gemini-only `snapshots` cache
// (lib/snapshotCache.js), so Claude's always-live results finally
// accumulate somewhere structured too. `reports.report_json`
// (lib/reports.js) stays the source of truth for a single test's own
// numbers; this table exists purely so those numbers can be tracked and
// compared over time and across competitors without re-parsing every
// historical report_json blob.
//
// buildObservationRows() is the ONE place that turns an engineData shape
// into observation rows — used both by recordObservations() (the live
// path, called from app/api/test/route.js right after saveReport()) and by
// scripts/backfill-ai-observations.mjs (reconstructing rows from already-
// saved report_json). Keeping this logic in exactly one place means the
// live path and the backfill can never quietly disagree about how an
// observation is derived — the same risk this codebase has already hit
// once with duplicated brand-matching logic (see lib/scoring.js's own
// normalizeBrand comment).

function questionHash(text) {
  const normalized = (text || "").trim().toLowerCase();
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

// The exact site the merchant's own recommendation pointed to (if any) —
// used for the destination classification below.
function firstRealCompetitor(recs, brand) {
  const idx = (recs || []).findIndex(
    (rec) => rec?.brand && !(matches(brand, rec.brand) || matches(brand, rec.product))
  );
  return idx >= 0 ? { rec: recs[idx], rank: idx + 1 } : null;
}

// TEST TIME vs SOURCE OBSERVATION TIME — the core distinction this
// hardening pass exists to enforce. A cached/harvested ChatGPT or Gemini
// result must never read as if it were freshly observed just because a
// merchant happened to run a report today; only a genuinely fresh call
// (Claude's live run, or THIS run's own on-demand harvest) gets
// source_observed_at === test_run_at.
//   row.source === "live"         -> Claude, called this request: fresh.
//   row.source === "live-harvest" -> chatgpt/gemini, called THIS request
//                                     (app/api/test/route.js's on-demand
//                                     harvest): also genuinely fresh.
//   row.source === "snapshot"     -> a pre-existing cached/banked answer;
//                                     row.collected_on is the real (if only
//                                     day-granular) date it was actually
//                                     obtained, and that — never "now" — is
//                                     the source_observed_at.
function sourceTiming(row, testRunAt) {
  if (row.source === "snapshot") {
    // collected_on is a DATE (e.g. "2026-08-30"), not a timestamp — the
    // underlying snapshot/bank data has never recorded more precision than
    // that, so source_observed_at is pinned to UTC midnight of that date
    // rather than implying a false level of precision.
    const day = row.collected_on && row.collected_on !== "live" ? row.collected_on : testRunAt.slice(0, 10);
    return { sourceType: "cache", sourceObservedAt: `${day}T00:00:00.000Z` };
  }
  if (row.source === "live-harvest") return { sourceType: "harvested", sourceObservedAt: testRunAt };
  return { sourceType: "live", sourceObservedAt: testRunAt };
}

function modelForRow(engine, sourceType) {
  // Only ever attached to a row this exact request actually generated —
  // never assumed for a pre-existing "cache" row, which may have been
  // captured (by scripts/harvest.py, or a bank file's inline seed) with a
  // different model version at a different time that this app has no
  // reliable way to know (hard rule 2: never fabricate).
  if (sourceType === "live") return engine === "claude" ? CLAUDE_MODEL : null;
  if (sourceType === "harvested") return HARVEST_MODELS[engine] || null;
  return null;
}

function collectionMethodFor(row, sourceType, engine) {
  if (sourceType === "live") return "claude-live-query";
  if (sourceType === "harvested") return `${engine}-on-demand-harvest`;
  if (typeof row.snapshotId === "string" && row.snapshotId.startsWith("bank-seed:")) return "bank-seed-snapshot";
  return "supabase-snapshot-cache";
}

// Pure, synchronous: turns one report's engineData into the observation
// rows that should be written for it. No Supabase access here — callers
// decide how (insert vs upsert) and whether (dry-run) to persist them.
//
// `overrideSourceType`/`collectionMethodPrefix`: used only by the backfill
// script (scripts/backfill-ai-observations.mjs), which reconstructs rows
// from an already-saved report_json rather than a request in flight — those
// rows are never allowed to claim "live"/"harvested" (requirement: never
// pretend a reconstructed row was a genuine live observation), so the
// backfill forces every row's source_type to "backfill" while preserving
// what it WOULD have been in `collection_method` for provenance.
export function buildObservationRows({
  reportSlug,
  market,
  categoryId,
  brand,
  brandWebsite,
  engineData,
  testRunAt,
  overrideSourceType = null,
}) {
  const brandDomain = normalizeDomain(brandWebsite);
  const rows = [];

  ENGINE_ORDER.forEach((engine) => {
    (engineData?.[engine] || []).forEach((row) => {
      // "missing" rows are a UI placeholder (no snapshot exists yet for
      // this engine/category) — never a real observation, so never logged
      // (hard rule 2: never fabricate/store an absence as data).
      if (row.source === "missing") return;

      const recs = row.recs || [];
      const idx = recs.findIndex((rec) => matches(brand, rec?.brand) || matches(brand, rec?.product));
      const appeared = idx >= 0;
      const yourRec = appeared ? recs[idx] : null;
      const destination = yourRec ? effectiveDestination(yourRec, { isYou: true, brandDomain }) : null;
      const competitor = firstRealCompetitor(recs, brand);
      const competitorDestination = competitor
        ? effectiveDestination(competitor.rec, { isYou: false, brandDomain })
        : null;

      const { sourceType: naturalSourceType, sourceObservedAt } = sourceTiming(row, testRunAt);
      const sourceType = overrideSourceType || naturalSourceType;
      const collectionMethod = overrideSourceType
        ? `backfill-from-report-json:${collectionMethodFor(row, naturalSourceType, engine)}`
        : collectionMethodFor(row, naturalSourceType, engine);
      const modelName = overrideSourceType ? null : modelForRow(engine, naturalSourceType);

      rows.push({
        report_slug: reportSlug || null,
        market,
        category_id: categoryId || null,
        brand,
        brand_domain: brandDomain || null,
        engine,
        qid: row.qid,
        question_text: row.text || null,
        question_hash: questionHash(row.text),
        language: row.language || null,
        archetype: row.archetype || null,
        appeared,
        rank: appeared ? idx + 1 : null,
        destination,
        destination_domain: yourRec?.destination_domain || null,
        destination_url: null, // never captured upstream today — see repo map / final summary
        marketplace_name: destination === "marketplace" ? marketplaceLabelForDomain(yourRec?.destination_domain) : null,
        top_competitor: competitor?.rec?.brand || null,
        top_competitor_domain: competitor?.rec?.destination_domain || null,
        top_competitor_rank: competitor?.rank ?? null,
        competitor_destination: competitorDestination,
        recommended_count: recs.length,
        source_type: sourceType,
        collection_method: collectionMethod,
        snapshot_id: typeof row.snapshotId === "string" ? row.snapshotId : null,
        model_name: modelName,
        model_version: null, // never exposed by any provider this app calls today
        test_run_at: testRunAt,
        source_observed_at: sourceObservedAt,
      });
    });
  });

  return rows;
}

// Best-effort — a write failure here is invisible to the merchant and
// never retried, same posture as lib/snapshotCache.js's writeThroughSnapshot.
// Idempotent: `.upsert(..., { ignoreDuplicates: true })` against the
// (report_slug, engine, qid, source_observed_at) unique index
// (supabase/migrations/0009) silently skips a row this exact report_slug
// already logged — a client-side retry of the same /api/test call (see
// components/test/QueryStep.js's own retry-the-same-liveRuns behavior)
// re-running recordObservations() for that SAME report_slug can never
// double-log it. This does NOT dedupe two independently-submitted reports
// (different report_slug) for what a human might call "the same test" —
// see this file's own header / the Phase 1.5 summary for why that's a
// separate, still-open gap in `reports`/saveReport() itself.
export async function recordObservations({ reportSlug, market, categoryId, brand, brandWebsite, engineData }) {
  const db = supabase();
  if (!db) return;

  const testRunAt = new Date().toISOString();
  const rows = buildObservationRows({ reportSlug, market, categoryId, brand, brandWebsite, engineData, testRunAt });
  if (rows.length === 0) return;

  try {
    // .select("id") after an ignoreDuplicates upsert returns only the rows
    // that were actually newly inserted (a row that hit the dedupe
    // constraint is silently skipped, not returned) — the difference from
    // rows.length is exactly how many duplicate attempts this call
    // prevented. Logged to system_events (same observability pattern as
    // app/api/test/route.js's contradiction guard) only when it's nonzero,
    // so scripts/observations_diagnostic (Phase 1.5 point 12) can report a
    // real "duplicate attempts prevented" count instead of a guess.
    const { data, error } = await db
      .from("ai_observations")
      .upsert(rows, { onConflict: "report_slug,engine,qid,source_observed_at", ignoreDuplicates: true })
      .select("id");
    if (error) {
      console.error("[observations] insert failed", error.message);
      return;
    }
    const inserted = data?.length ?? rows.length;
    const skipped = rows.length - inserted;
    if (skipped > 0) {
      await logSystemEvent("observations_dedup", "test", { reportSlug, attempted: rows.length, inserted, skipped });
    }
  } catch (e) {
    console.error("[observations] insert failed", e?.message || e);
  }
}

// Trend data behind components/test/report/VisibilityHistoryCard.js: one
// point per distinct day this exact brand+market+category has REAL
// observations for, oldest first. Reads the `brand_visibility_trend` view
// (supabase/migrations/0009) — a per-day aggregate, already deduped against
// the same underlying snapshot being read by more than one report on the
// same day (see that migration's own comment on the view) — rather than
// re-deriving from every historical report_json. Never fabricates a trend
// point — returns [] whenever Supabase isn't configured, required params
// are missing, or the underlying query fails; the caller (app/api/history)
// additionally treats fewer than 2 points as "no trend yet" (a single point
// isn't one).
export async function getVisibilityTrend({ brand, market, categoryId, limit = 24 }) {
  const db = supabase();
  if (!db || !brand || !market || !categoryId) return [];
  try {
    const { data, error } = await db
      .from("brand_visibility_trend")
      .select("observed_on, observation_count, distinct_engines, appearance_rate, avg_rank, own_site_pct, marketplace_pct")
      .eq("brand", brand)
      .eq("market", market)
      .eq("category_id", categoryId)
      .order("observed_on", { ascending: true })
      .limit(limit);
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

import { supabase } from "./supabaseClient";
import { ENGINE_ORDER, matches, effectiveDestination, normalizeDomain } from "./scoring";

// Structured, historical AI-observation log (Phase 1 "Foundation" — see
// supabase/migrations/0008_ai_observations.sql for the full rationale):
// one row per (engine, question) real result from a completed test, across
// all three engines — not just the chatgpt/gemini-only `snapshots` cache
// (lib/snapshotCache.js), so Claude's always-live results finally
// accumulate somewhere structured too. `reports.report_json`
// (lib/reports.js) stays the source of truth for a single test's own
// numbers; this table exists purely so those numbers can be tracked and
// compared over time and across competitors without re-parsing every
// historical report_json blob. Called from app/api/test/route.js right
// after saveReport() — best-effort, same never-block-the-merchant pattern
// as lib/snapshotCache.js's writeThroughSnapshot: a write failure here is
// invisible to the merchant and never retried.

function firstRealCompetitor(recs, brand) {
  const other = (recs || []).find(
    (rec) => rec?.brand && !(matches(brand, rec.brand) || matches(brand, rec.product))
  );
  return other?.brand || null;
}

export async function recordObservations({ reportSlug, market, categoryId, brand, brandWebsite, engineData }) {
  const db = supabase();
  if (!db) return;

  const brandDomain = normalizeDomain(brandWebsite);
  const today = new Date().toISOString().slice(0, 10);
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

      rows.push({
        report_slug: reportSlug || null,
        market,
        category_id: categoryId || null,
        brand,
        engine,
        qid: row.qid,
        archetype: row.archetype || null,
        appeared,
        rank: appeared ? idx + 1 : null,
        destination,
        destination_domain: yourRec?.destination_domain || null,
        top_competitor: firstRealCompetitor(recs, brand),
        source: row.source || "unknown",
        observed_on: row.collected_on && row.collected_on !== "live" ? row.collected_on : today,
      });
    });
  });

  if (rows.length === 0) return;
  try {
    const { error } = await db.from("ai_observations").insert(rows);
    if (error) console.error("[observations] insert failed", error.message);
  } catch (e) {
    console.error("[observations] insert failed", e?.message || e);
  }
}

// Trend data behind components/test/report/VisibilityHistoryCard.js: one
// point per distinct day this exact brand+market+category was tested,
// oldest first. Reads the `brand_visibility_trend` view (a per-day
// aggregate over ai_observations) rather than re-deriving from every
// historical report_json. Never fabricates a trend point — returns []
// whenever Supabase isn't configured, required params are missing, or the
// underlying query fails; the caller (app/api/history) additionally
// treats fewer than 2 points as "no trend yet" (a single point isn't one).
export async function getVisibilityTrend({ brand, market, categoryId, limit = 24 }) {
  const db = supabase();
  if (!db || !brand || !market || !categoryId) return [];
  try {
    const { data, error } = await db
      .from("brand_visibility_trend")
      .select("observed_on, appearance_rate, avg_rank, own_site_pct, marketplace_pct")
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

import { supabase } from "./supabaseClient";

// Phase 4 write-through cache for on-demand chatgpt/gemini harvests
// (lib/harvestClients.js): a category+engine gets harvested live at most
// once across ALL visitors (not once per visitor) — the first on-demand
// harvest for a stale category writes here, every later request for that
// same market+category reads it back before ever considering another
// harvest. Bank JSON (data/*.json) stays the seed layer: these rows are
// deltas merged ON TOP of the bank's own inline snapshots, never a
// replacement for the file.
//
// Deliberately NOT used for custom categories (app/api/test/route.js's
// customCategory path): every custom category shares the same fixed qids
// ("custom-discovery"/"custom-local"/"custom-branded"/"custom-problem")
// regardless of what the merchant typed, and has no real category_id (the
// bank's kebab-case slug) to key on. Caching by market+null-category_id+qid
// would silently serve one merchant's "drone repair kits" answer to another
// merchant's completely different "candle making kits" test the same day —
// a real cross-contamination bug, not a hypothetical one. Custom runs
// always harvest fresh (or fall back to "missing"), same as before Phase 4.

export async function fetchCachedSnapshots(market, categoryId) {
  const db = supabase();
  if (!db || !categoryId) return [];
  try {
    const { data, error } = await db
      .from("snapshots")
      .select("qid, engine, collected_on, snapshot_json")
      .eq("market", market)
      .eq("category_id", categoryId);
    if (error || !data) {
      if (error) console.error("[snapshot-cache] read failed", error.message);
      return [];
    }
    return data.map((row) => ({
      qid: row.qid,
      engine: row.engine,
      collected_on: row.collected_on,
      recommendations: row.snapshot_json?.recommendations || [],
      sources_cited: row.snapshot_json?.sources_cited || [],
    }));
  } catch (e) {
    console.error("[snapshot-cache] read failed", e?.message || e);
    return [];
  }
}

// Best-effort — a failed write-through must never fail the merchant's
// in-flight test. onConflict matches the unique constraint in
// supabase/migrations/0001_phase4_schema.sql, so a duplicate same-day
// harvest (two visitors racing the same stale category) just overwrites
// with equivalent data instead of erroring.
export async function writeThroughSnapshot({ market, categoryId, qid, engine, collectedOn, recommendations, sources }) {
  const db = supabase();
  if (!db || !categoryId) return;
  try {
    const { error } = await db.from("snapshots").upsert(
      {
        market,
        category_id: categoryId,
        qid,
        engine,
        collected_on: collectedOn,
        snapshot_json: { recommendations, sources_cited: sources || [] },
      },
      { onConflict: "market,category_id,qid,engine,collected_on" }
    );
    if (error) console.error("[snapshot-cache] write-through failed", error.message);
  } catch (e) {
    console.error("[snapshot-cache] write-through failed", e?.message || e);
  }
}

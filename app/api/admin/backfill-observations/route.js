import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { buildObservationRows } from "@/lib/observations";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 500;

// Admin-only backfill for reports.report_json history (Phase 1.5 point 8):
// reconstructs ai_observations rows for reports that predate — or for any
// other reason never got — live-path observation logging
// (lib/observations.js's recordObservations(), wired in from
// app/api/test/route.js). Reuses buildObservationRows() directly, the
// SAME function the live path calls, so a backfilled row is derived by
// identical logic to a live one — never a second, independently-written
// reimplementation that could quietly drift from it.
//
// Every row this writes is stamped source_type="backfill" (never "live"/
// "harvested"/"cache") — a reconstructed row must never claim to have
// been a genuine live observation. Its timestamp is the report's own
// saved `created_at` (the best defensible evidence available for a
// historical row); if the original report_json had per-question
// collected_on dates for a "snapshot" source, buildObservationRows still
// prefers those — see its own sourceTiming() comment — but they now land
// under source_type="backfill" too, not "cache", because point 8 is
// explicit that a reconstructed row must never pretend to be anything but
// a reconstruction.
//
// Idempotent: skips any report whose slug ALREADY has ANY ai_observations
// rows (regardless of source_type) — running this against a report the
// live pipeline already logged would otherwise create a second, slightly
// differently-timestamped row for the same real event, silently inflating
// every downstream count this table feeds. Re-running with the same
// offset/limit after a partial failure is safe: already-backfilled slugs
// from a prior successful call are skipped the same way.
//
// Never runs automatically — no cron, no build hook. Batches through
// `reports` ordered by created_at; call repeatedly with the returned
// `nextOffset` until `done: true`.
//
//   Dry run (default — writes nothing, just reports what would happen):
//     curl -X POST "$SITE/api/admin/backfill-observations?limit=200&offset=0" \
//       -H "x-admin-token: $ADMIN_TOKEN"
//
//   Actually write:
//     curl -X POST "$SITE/api/admin/backfill-observations?dryRun=false&limit=200&offset=0" \
//       -H "x-admin-token: $ADMIN_TOKEN"
export async function POST(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = supabase();
  if (!db) return NextResponse.json({ error: "Supabase is not configured." }, { status: 501 });

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") !== "false";
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "", 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(searchParams.get("offset") || "", 10) || 0, 0);

  const { data: reportsBatch, error: fetchError } = await db
    .from("reports")
    .select("slug, market, category_id, brand, brand_display_name, brand_domain, report_json, created_at")
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (fetchError) {
    return NextResponse.json({ error: `Failed to read reports: ${fetchError.message}` }, { status: 500 });
  }

  const summary = {
    dryRun,
    batch: { offset, limit, fetched: reportsBatch.length },
    processed: 0,
    rowsWritten: 0,
    rowsThatWouldBeWritten: 0,
    skippedAlreadyCovered: 0,
    skippedNoEngineData: 0,
    errors: [],
    nextOffset: reportsBatch.length === limit ? offset + limit : null,
    done: reportsBatch.length < limit,
  };

  if (reportsBatch.length === 0) {
    return NextResponse.json(summary);
  }

  const slugs = reportsBatch.map((r) => r.slug).filter(Boolean);
  const { data: existing, error: existingError } = await db
    .from("ai_observations")
    .select("report_slug")
    .in("report_slug", slugs);
  if (existingError) {
    return NextResponse.json(
      { error: `Failed to check existing observations: ${existingError.message}` },
      { status: 500 }
    );
  }
  const alreadyCovered = new Set((existing || []).map((r) => r.report_slug));

  for (const report of reportsBatch) {
    if (!report.slug || alreadyCovered.has(report.slug)) {
      summary.skippedAlreadyCovered += 1;
      continue;
    }
    const engineData = report.report_json?.engines;
    if (!engineData || typeof engineData !== "object") {
      summary.skippedNoEngineData += 1;
      continue;
    }

    let rows;
    try {
      rows = buildObservationRows({
        reportSlug: report.slug,
        market: report.market,
        categoryId: report.category_id,
        brand: report.brand_display_name || report.brand,
        brandWebsite: report.brand_domain,
        engineData,
        testRunAt: report.created_at,
        overrideSourceType: "backfill",
      });
    } catch (e) {
      summary.errors.push({ slug: report.slug, error: e?.message || String(e) });
      continue;
    }

    summary.processed += 1;
    if (rows.length === 0) continue;

    if (dryRun) {
      summary.rowsThatWouldBeWritten += rows.length;
      continue;
    }

    const { error: insertError } = await db
      .from("ai_observations")
      .upsert(rows, { onConflict: "report_slug,engine,qid,source_observed_at", ignoreDuplicates: true });
    if (insertError) {
      summary.errors.push({ slug: report.slug, error: insertError.message });
      continue;
    }
    summary.rowsWritten += rows.length;
  }

  return NextResponse.json(summary);
}

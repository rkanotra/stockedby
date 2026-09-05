import { NextResponse } from "next/server";
import { getReportBySlug } from "@/lib/reports";
import { getVisibilityTrend } from "@/lib/observations";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Read-only AI-visibility trend, scoped to an existing report's slug
// (Phase 1.5 hardening). Powers
// components/test/report/VisibilityHistoryCard.js.
//
// Security review (Phase 1.5, point 10): the first version of this route
// took brand/market/categoryId directly as query params — since a report's
// full evidence is already intentionally public once you have its slug
// (hard rule 8/lib/reports.js's own comment: "there's nothing sensitive
// about persisting the full report up front"), that meant ANYONE could
// query a competitor's, or any brand's, visibility trend just by guessing
// a brand name/market/category string — no slug, no report, no need to
// have ever been shown that data. That's strictly wider exposure than the
// existing public-report model (which requires the specific unguessable
// slug). Fixed by requiring `slug`, resolving brand/market/category_id
// SERVER-SIDE from that report row (never trusting a client-supplied
// brand/market/category directly), and dropping the raw query-param form
// entirely. This also can't leak a nonexistent-slug's data (404/empty), a
// deleted/private field, or anything beyond the same 4 trend numbers
// (observed_on, observation_count, distinct_engines, appearance_rate,
// avg_rank, own_site_pct, marketplace_pct) — no emails, no internal ids,
// no raw provider responses, ever.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = (searchParams.get("slug") || "").trim();
  if (!slug) {
    return NextResponse.json({ ok: true, trend: [] });
  }

  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip, { namespace: "history", limit: 200 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const row = await getReportBySlug(slug);
  if (!row) {
    return NextResponse.json({ ok: true, trend: [] });
  }

  // category_id here matches exactly what ai_observations.category_id was
  // populated with (app/api/test/route.js passes categoryId: category.id,
  // the same value lib/reports.js's saveReport() stores in this column) —
  // category_slug is only a fallback for a report saved before that column
  // existed.
  const brand = row.brand_display_name || row.brand;
  const categoryId = row.category_id || row.category_slug;
  const trend = await getVisibilityTrend({ brand, market: row.market, categoryId });
  return NextResponse.json({ ok: true, trend: trend.length >= 2 ? trend : [] });
}

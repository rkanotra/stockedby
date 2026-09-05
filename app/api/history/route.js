import { NextResponse } from "next/server";
import { listMarkets } from "@/lib/bank";
import { getVisibilityTrend } from "@/lib/observations";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Read-only AI-visibility trend for a brand+market+category (Phase 1
// "Foundation" — see supabase/migrations/0008_ai_observations.sql and
// lib/observations.js). Powers
// components/test/report/VisibilityHistoryCard.js. Same never-fabricate
// posture as the rest of the app: below 2 real historical days this
// returns an empty trend, never a guessed/interpolated point — the
// component itself hides entirely rather than show a single-point "trend."
// Own rate-limit namespace (hard rule 9's pattern) since this is public,
// unauthenticated read traffic separate from the free-test cap itself.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const brand = (searchParams.get("brand") || "").trim();
  const market = (searchParams.get("market") || "").trim();
  const categoryId = (searchParams.get("categoryId") || "").trim();

  if (!brand || !market || !categoryId) {
    return NextResponse.json({ ok: true, trend: [] });
  }
  if (!listMarkets({ includeUnlisted: true }).includes(market)) {
    return NextResponse.json({ ok: true, trend: [] });
  }

  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip, { namespace: "history", limit: 200 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const trend = await getVisibilityTrend({ brand, market, categoryId });
  return NextResponse.json({ ok: true, trend: trend.length >= 2 ? trend : [] });
}

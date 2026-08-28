import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";
import { listMarkets } from "@/lib/bank";

// Freshness signal (market-expansion phase): a zero-result category search
// is both a UX signal and the query-bank expansion list — see
// components/test/CategoryStep.js's debounced client trigger. Pure logging,
// best-effort — always returns ok even when Supabase isn't configured or
// the insert fails, since this must never surface as an error to a
// merchant who just typed a category StockedBy doesn't have yet.
export const runtime = "nodejs";

// Its own generous namespace/limit — this is abuse-prevention only (the
// same pattern as app/api/test/query's 200/day cap), not a real user-facing
// constraint; a legitimate user could plausibly search several zero-result
// terms in one session while looking for their category.
const LIMIT = 100;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const { market, searchText } = body || {};
  const text = typeof searchText === "string" ? searchText.trim().slice(0, 200) : "";
  // includeUnlisted: true — a Pakistan merchant's failed search is exactly
  // as useful a signal as anyone else's, even though Pakistan is hidden.
  if (!text || !market || !listMarkets({ includeUnlisted: true }).includes(market)) {
    return NextResponse.json({ ok: true });
  }

  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip, { namespace: "log-failed-search", limit: LIMIT });
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: true });
  }

  const db = supabase();
  if (db) {
    try {
      await db.from("failed_category_searches").insert({ market, search_text: text });
    } catch (e) {
      console.error("[log-failed-search] insert failed", e?.message || e);
    }
  }

  return NextResponse.json({ ok: true });
}

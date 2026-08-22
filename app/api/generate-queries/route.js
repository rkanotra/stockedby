import { NextResponse } from "next/server";
import { generateCustomQueries } from "@/lib/claudeClient";
import { listMarkets } from "@/lib/bank";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";
import { supabase } from "@/lib/supabaseClient";

// Short generation call, not a live web-search test — no need for the
// 60s ceiling app/api/test/route.js raises for itself.
export const runtime = "nodejs";
export const maxDuration = 30;

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Custom-category flow, step 1: search had no bank match, merchant typed a
// category name + their brand, we generate 4 real shopper questions with
// Claude (lib/claudeClient.js generateCustomQueries). The client shows
// these for mandatory review/edit before POST /api/test ever runs them —
// this endpoint never runs a live test itself.
export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server misconfigured: ANTHROPIC_API_KEY is not set." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const { market, categoryName, brand } = body || {};

  if (!market || !listMarkets().includes(market)) {
    return badRequest(`"market" must be one of: ${listMarkets().join(", ")}.`);
  }
  const category = typeof categoryName === "string" ? categoryName.trim() : "";
  if (!category) {
    return badRequest('"categoryName" is required.');
  }
  const brandName = typeof brand === "string" ? brand.trim() : "";
  if (!brandName) {
    return badRequest('"brand" is required — the branded-routing question needs your brand name.');
  }

  // Separate counter from /api/test's — a generation call is its own,
  // smaller cost surface (hard rule 7 doesn't cover this call, see
  // lib/claudeClient.js), so it gets its own daily cap rather than sharing
  // the test endpoint's.
  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip, { namespace: "generate-queries" });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Daily custom-category limit reached for your network. Try again tomorrow." },
      { status: 429 }
    );
  }

  // Never written into data/*.json (hard rule: custom categories stay out
  // of the canonical bank). Phase 4: persisted to custom_category_requests
  // so the most-requested customs can become real bank additions — falls
  // back to console if Supabase isn't configured, and either way this is
  // best-effort: a logging failure must never fail the generation itself.
  const db = supabase();
  if (db) {
    try {
      const { error } = await db
        .from("custom_category_requests")
        .insert({ market, category_text: category });
      if (error) console.error("[custom-category] insert failed", error.message);
    } catch (e) {
      console.error("[custom-category] insert failed", e?.message || e);
    }
  } else {
    console.log(`[custom-category] market=${market} category="${category}" brand="${brandName}"`);
  }

  try {
    const queries = await generateCustomQueries({ market, categoryName: category, brand: brandName });
    return NextResponse.json({ ok: true, category, queries });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Query generation failed. Please try again." },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";
import { askShoppingAssistant } from "@/lib/claudeClient";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

// One live Claude call per request — the client (components/test/TestFlow.js)
// fires one of these per shopper question, in parallel, instead of a single
// /api/test invocation running all of them internally. That was the actual
// architectural problem behind the persistent "N questions couldn't
// complete": every query's live Claude call (including any pause_turn
// continuation, see lib/claudeClient.js) shared ONE Vercel function's
// duration budget, so a single slow/paused question could burn through
// most of it, and any question still running when the whole invocation hit
// its ceiling was killed along with every other question in that same
// batch — not just the slow one. Isolating each question into its own
// short-lived request means only THAT question is ever at risk, and it's
// hard-capped well under even a conservative reading of Vercel's duration
// limits (see maxDuration below) rather than trying to buy more room by
// raising the ceiling.
export const maxDuration = 55;
export const runtime = "nodejs";

const QUERY_TIMEOUT_MS = 50_000; // hard cap — see lib/claudeClient.js's askShoppingAssistant
const MAX_TEXT_LENGTH = 600;

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

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

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_TEXT_LENGTH) {
    return badRequest('"text" is required and must be a real shopper question.');
  }
  const archetype = typeof body?.archetype === "string" ? body.archetype : "";

  // A test fires up to MAX_QUERIES (app/api/test/route.js) of these per
  // run, each with the client's own one-retry-on-failure (a fresh request,
  // not a same-invocation retry — see TestFlow.js), plus whatever a
  // merchant's manual "Retry" click on the report adds. This cap exists
  // only to stop direct abuse of this endpoint outside the normal wizard
  // flow — the real per-test cost ceiling is /api/test's own daily cap
  // (hard rule 9), in a separate namespace, unaffected by this one.
  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip, { namespace: "test-query", limit: 200 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many questions from your network today. Try again tomorrow." },
      { status: 429 }
    );
  }

  // Problem-first questions ("my skin looks dull, what should I use") tend
  // to trigger the longest, most search-heavy turns — cutting web_search's
  // max_uses to 1 for that archetype specifically reduces its worst-case
  // time without touching the other archetypes' full 2 searches.
  const maxUses = archetype === "problem-first" ? 1 : 2;

  try {
    const value = await askShoppingAssistant(text, { timeoutMs: QUERY_TIMEOUT_MS, maxUses });
    return NextResponse.json({
      status: "done",
      recs: value.recs,
      searches: value.searches,
      citations: value.citations,
    });
  } catch (e) {
    // Never a 5xx for a real, expected "this one question failed" outcome —
    // the client treats any non-"done" status as this question needing its
    // retry (automatic the first time, the report's "Retry" button after
    // that), same as a network-level failure would.
    return NextResponse.json({
      status: "error",
      error: e?.message || "Live test failed for this question.",
    });
  }
}

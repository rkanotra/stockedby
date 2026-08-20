import { NextResponse } from "next/server";
import { getCategory, listMarkets } from "@/lib/bank";
import { askShoppingAssistant, analyzeSentiment } from "@/lib/claudeClient";
import {
  ENGINES,
  matches,
  computeReport,
  computeAppearanceSummary,
  computeFanout,
  computeTrustedSources,
} from "@/lib/scoring";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

// Vercel Hobby defaults Node functions to a 10s timeout — a single live
// Claude call with web search regularly runs longer than that. Raise the
// ceiling (Hobby's configurable max) so the run isn't cut off mid-request.
export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_QUERIES = 6;

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

  const { market, categoryId, brand, competitor, brandWebsite, queries: queryOverrides } = body || {};

  if (!market || !listMarkets().includes(market)) {
    return badRequest(`"market" must be one of: ${listMarkets().join(", ")}.`);
  }
  if (!categoryId || typeof categoryId !== "string") {
    return badRequest('"categoryId" is required.');
  }
  if (!brand || typeof brand !== "string" || !brand.trim()) {
    return badRequest('"brand" is required.');
  }

  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Daily free-test limit reached for your network. Try again tomorrow." },
      { status: 429 }
    );
  }

  const category = getCategory(market, categoryId);
  if (!category) {
    return NextResponse.json({ error: `Unknown category "${categoryId}" for ${market}.` }, { status: 404 });
  }

  const brandName = brand.trim();
  const competitorName = typeof competitor === "string" ? competitor.trim() : "";
  const brandWebsiteInput = typeof brandWebsite === "string" ? brandWebsite.trim() : "";

  // Editable queries (phase 3 UI): override text by qid, but only for qids
  // that actually belong to this category.
  const overrideByQid = new Map(
    Array.isArray(queryOverrides)
      ? queryOverrides.filter((q) => q && q.qid).map((q) => [q.qid, q.text])
      : []
  );
  const finalQueries = category.queries.slice(0, MAX_QUERIES).map((q) => ({
    qid: q.qid,
    text: (overrideByQid.get(q.qid) || q.text || "").trim() || q.text,
    archetype: q.archetype,
    language: q.language,
    leader_brand: q.leader_brand || "",
  }));

  if (finalQueries.length === 0) {
    return badRequest("This category has no queries to run.");
  }

  // Live Claude calls run in parallel — sequential per-query calls (as in
  // the prototype, which needed that to drive incremental UI state) would
  // risk exceeding maxDuration for a 4-query category.
  const settled = await Promise.allSettled(
    finalQueries.map((q) => askShoppingAssistant(q.text))
  );

  const liveRuns = finalQueries.map((q, i) => {
    const result = settled[i];
    if (result.status === "fulfilled") {
      return {
        qid: q.qid,
        text: q.text,
        archetype: q.archetype,
        status: "done",
        recs: result.value.recs,
        searches: result.value.searches,
        citations: result.value.citations,
      };
    }
    return {
      qid: q.qid,
      text: q.text,
      archetype: q.archetype,
      status: "error",
      recs: [],
      searches: [],
      citations: [],
      error: result.reason?.message || "Live test failed for this query.",
    };
  });

  const doneRuns = liveRuns.filter((r) => r.status === "done");
  if (doneRuns.length === 0) {
    return NextResponse.json(
      { error: "The live Claude test failed for every query. Please try again." },
      { status: 502 }
    );
  }

  // engineData: claude = live results just collected; every other engine
  // (rule 6) is never called live — only rendered from harvested snapshots.
  const engineData = { claude: doneRuns.map((r) => ({ ...r, collected_on: "live", source: "live" })) };
  for (const engine of ENGINES) {
    if (engine === "claude") continue;
    engineData[engine] = finalQueries.map((q) => {
      const snaps = (category.snapshots || []).filter((s) => s.qid === q.qid && s.engine === engine);
      const latest = snaps.sort((a, b) => (a.collected_on < b.collected_on ? 1 : -1))[0];
      if (!latest) {
        return { qid: q.qid, text: q.text, archetype: q.archetype, recs: [], collected_on: null, source: "missing" };
      }
      return {
        qid: q.qid,
        text: q.text,
        archetype: q.archetype,
        recs: latest.recommendations.map((rec) => ({
          brand: rec.brand || "",
          product: rec.product || "",
          why: rec.why || "",
          destination: rec.destination || "none",
          destination_domain: rec.destination_domain || "",
        })),
        collected_on: latest.collected_on,
        source: "snapshot",
      };
    });
  }

  // Sentiment (haiku, aux call — hard rule 7): grounded ONLY in verbatim
  // "why" text from shelves where the brand actually appeared. Below 2 real
  // mentions there isn't enough signal to analyze without the model filling
  // gaps from outside knowledge — skip the call entirely rather than risk a
  // fabricated-sounding answer (a real bug had this describe a brand using
  // an unrelated same-named company's history).
  const mentions = [];
  Object.values(engineData)
    .flat()
    .forEach((r) =>
      r.recs.forEach((rec) => {
        if ((matches(brandName, rec.brand) || matches(brandName, rec.product)) && rec.why) {
          mentions.push(rec.why);
        }
      })
    );

  let sentiment = null;
  if (mentions.length >= 2) {
    try {
      sentiment = await analyzeSentiment(brandName, mentions.slice(0, 12));
    } catch {
      sentiment = null;
    }
  }

  // Scoring must only see rows with real data — an engine with zero
  // snapshots for this category has "missing" placeholder rows so the UI
  // can render its own data-coming-soon state, but those placeholders
  // are not a real score of 0 and must not drag the average down or
  // inflate totalRows (rule 2: never fabricate).
  const scoringEngineData = Object.fromEntries(
    Object.entries(engineData).map(([engine, rows]) => [engine, rows.filter((r) => r.source !== "missing")])
  );

  // From the RAW liveRuns (done + error), not the filtered scoring data —
  // a failed live call must show up as "couldn't complete," never silently
  // shrink the denominator the same way a real "not recommended" would.
  const appearanceSummary = computeAppearanceSummary(liveRuns, brandName);

  const report = computeReport({
    market,
    brand: brandName,
    competitor: competitorName,
    brandWebsite: brandWebsiteInput,
    engineData: scoringEngineData,
    appearanceSummary,
  });

  return NextResponse.json({
    ok: true,
    market,
    category: { id: category.id, name: category.name, group: category.group },
    brand: brandName,
    competitor: competitorName || null,
    brandWebsite: brandWebsiteInput || null,
    queries: finalQueries,
    liveRuns,
    engines: engineData,
    report,
    sentiment,
    mentionCount: mentions.length,
    fanout: computeFanout(liveRuns),
    trustedSources: computeTrustedSources(liveRuns),
    rateLimit,
  });
}

import { NextResponse } from "next/server";
import { getCategory, listMarkets } from "@/lib/bank";
import { askShoppingAssistant, analyzeSentiment } from "@/lib/claudeClient";
import { HARVEST_ENGINES } from "@/lib/harvestClients";
import { staleEnginesFor } from "@/lib/freshness";
import { fetchCachedSnapshots, writeThroughSnapshot } from "@/lib/snapshotCache";
import { saveReport } from "@/lib/reports";
import {
  ENGINE_ORDER,
  matches,
  computeReport,
  computeAppearanceSummary,
  computeFanout,
  computeTrustedSources,
} from "@/lib/scoring";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

// Vercel Hobby defaults Node functions to a 10s timeout — a single live
// Claude call with web search regularly runs longer than that. 100s budgets
// for one full retry per query on top of the original ceiling (40s first
// attempt + up to 13s of 429 backoff/stagger + 20s retry attempt + ~10s
// sentiment + overhead — see runQueryWithRetry below) so a transient
// failure doesn't get reported before a second real try. If this exceeds
// the account's actual plan ceiling, the deploy fails cleanly (the prior
// deployment stays live) — dial the number back rather than guess further.
export const maxDuration = 100;
export const runtime = "nodejs";

const MAX_QUERIES = 6;
const QUERY_TIMEOUT_MS = 40_000;
const RETRY_TIMEOUT_MS = 20_000;
const RETRY_WAIT_MS = 3_000;
const RETRY_STAGGER_MS = 2_000;
const MAX_STAGGERED_INDEX = 3; // caps worst-case added wall time from stagger

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err) {
  return err?.status === 429;
}

// Each query gets one retry, 3s after the first failure, before it's ever
// reported as "couldn't complete" — a slow web search or a momentary 429
// shouldn't cost a merchant a real data point. When the first failure was a
// 429 specifically, the retry is additionally staggered by query index (2s
// each, capped) rather than firing right back at the API alongside every
// other query's retry — the same simultaneous-burst pattern that likely
// caused the 429 in the first place. Never throws — always resolves to a
// Promise.allSettled-shaped {status, value|reason} object, since this is
// used in place of Promise.allSettled itself below.
async function runQueryWithRetry(q, index) {
  try {
    const value = await askShoppingAssistant(q.text, { timeoutMs: QUERY_TIMEOUT_MS });
    return { status: "fulfilled", value };
  } catch (firstErr) {
    const stagger = isRateLimitError(firstErr) ? Math.min(index, MAX_STAGGERED_INDEX) * RETRY_STAGGER_MS : 0;
    await sleep(RETRY_WAIT_MS + stagger);
    try {
      const value = await askShoppingAssistant(q.text, { timeoutMs: RETRY_TIMEOUT_MS });
      return { status: "fulfilled", value };
    } catch (secondErr) {
      return { status: "rejected", reason: secondErr };
    }
  }
}

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

  const { market, categoryId, brand, competitor, brandWebsite, queries: queryOverrides, customCategory } = body || {};

  if (!market || !listMarkets().includes(market)) {
    return badRequest(`"market" must be one of: ${listMarkets().join(", ")}.`);
  }
  if (!customCategory && (!categoryId || typeof categoryId !== "string")) {
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

  // Custom category (search had no bank match, merchant generated + reviewed
  // 4 questions via /api/generate-queries): the client sends the full,
  // already-edited category+queries directly — there's no bank entry to look
  // up, and none gets written (hard rule: custom categories never land in
  // data/*.json). category.snapshots stays empty so every non-claude engine
  // below is always "stale" and always attempts an on-demand harvest.
  let category;
  if (customCategory) {
    const name = typeof customCategory.name === "string" ? customCategory.name.trim() : "";
    if (!name) return badRequest('"customCategory.name" is required.');
    const rawQueries = Array.isArray(customCategory.queries) ? customCategory.queries : [];
    const cleanQueries = rawQueries
      .map((q) => ({
        qid: typeof q?.qid === "string" ? q.qid.trim() : "",
        text: typeof q?.text === "string" ? q.text.trim() : "",
        archetype: typeof q?.archetype === "string" ? q.archetype : "",
        language: typeof q?.language === "string" ? q.language : "en",
      }))
      .filter((q) => q.qid && q.text);
    if (cleanQueries.length === 0) return badRequest('"customCategory.queries" must include at least one question.');
    category = { id: null, name, group: null, queries: cleanQueries, snapshots: [] };
  } else {
    category = getCategory(market, categoryId);
    if (!category) {
      return NextResponse.json({ error: `Unknown category "${categoryId}" for ${market}.` }, { status: 404 });
    }
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

  // Phase 4 snapshot cache: Supabase rows for this market+category, merged
  // on top of the bank's own inline seed snapshots (lib/snapshotCache.js —
  // a no-op returning [] for custom categories, or if Supabase isn't
  // configured). This — not category.snapshots alone — is what "is this
  // engine stale" and "what's the fallback if harvest fails" are computed
  // against below, so a category harvested by an earlier visitor today
  // reads as fresh for every later visitor, not just the one who paid for
  // the harvest.
  const cachedSnapshots = await fetchCachedSnapshots(market, category.id);
  const allSnapshots = [...(category.snapshots || []), ...cachedSnapshots];

  // On-demand harvest (chatgpt/gemini): only for engines whose newest
  // snapshot for this category+market is missing or older than
  // lib/freshness.js's SNAPSHOT_MAX_AGE_DAYS, and only if the matching API
  // key is configured (lib/harvestClients.js) — otherwise those engines
  // fall through to the existing snapshot/"missing" behavior below,
  // unchanged. Cost guard: runs at most once per test (no retry loop, one
  // job per stale engine here), capped at HARVEST_QUERY_CAP queries per
  // engine — with only chatgpt/gemini ever eligible, that's <= 2 engines x
  // 4 queries = 8 extra calls, max. Fired in the SAME Promise.allSettled
  // batch as the live Claude calls below so it costs no extra wall-clock
  // time, not appended after.
  const HARVEST_QUERY_CAP = 4;
  const HARVEST_ENV_KEY = { gemini: "GEMINI_API_KEY", chatgpt: "OPENAI_API_KEY" };
  const harvestEngines = staleEnginesFor(
    { snapshots: allSnapshots },
    ENGINE_ORDER.filter((e) => e !== "claude")
  ).filter((e) => Boolean(process.env[HARVEST_ENV_KEY[e]]));
  const harvestQueries = finalQueries.slice(0, HARVEST_QUERY_CAP);
  const harvestJobs = harvestEngines.flatMap((engine) => harvestQueries.map((q) => ({ engine, q })));

  // Live Claude calls run in parallel — sequential per-query calls (as in
  // the prototype, which needed that to drive incremental UI state) would
  // risk exceeding maxDuration for a 4-query category. Each query retries
  // once on its own (runQueryWithRetry, see above) before it can end up in
  // `settled` as rejected, so `settled` is already in Promise.allSettled's
  // {status, value|reason} shape without needing that wrapper itself. On-
  // demand harvest jobs (if any) run in this same parallel batch — they
  // keep their existing run-once-ever cost guard (no retry), unrelated to
  // this per-query retry.
  const [settled, harvestSettled] = await Promise.all([
    Promise.all(finalQueries.map((q, i) => runQueryWithRetry(q, i))),
    Promise.allSettled(harvestJobs.map((job) => HARVEST_ENGINES[job.engine](job.q.text))),
  ]);

  // Never written back to data/*.json (Vercel's filesystem is ephemeral
  // anyway) — instead write-through to the Supabase snapshots table
  // (lib/snapshotCache.js), a no-op if Supabase isn't configured or this is
  // a custom category (category.id null). Awaited (not fire-and-forget) so
  // the write is actually queued before a serverless function can tear
  // down post-response; each write is cheap and this only runs for engines
  // that were genuinely stale, so it doesn't add much to the request.
  const today = new Date().toISOString().slice(0, 10);
  const harvestedByEngineQid = new Map();
  await Promise.all(
    harvestJobs.map(async (job, i) => {
      const result = harvestSettled[i];
      if (result.status !== "fulfilled") {
        // A failed on-demand harvest just falls through to the existing
        // snapshot lookup below (or "missing") — never fabricated, and
        // never silently retried (the cost guard above already ran this
        // once).
        return;
      }
      const recs = result.value.recommendations || [];
      harvestedByEngineQid.set(`${job.engine}:${job.q.qid}`, recs);
      await writeThroughSnapshot({
        market,
        categoryId: category.id,
        qid: job.q.qid,
        engine: job.engine,
        collectedOn: today,
        recommendations: recs,
        sources: result.value.sources,
      });
    })
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
      error: result.reason?.message || "Live test failed for this query after a retry.",
    };
  });

  const doneRuns = liveRuns.filter((r) => r.status === "done");
  if (doneRuns.length === 0) {
    return NextResponse.json(
      { error: "The live Claude test failed for every query. Please try again." },
      { status: 502 }
    );
  }

  // engineData: claude = live results just collected. Every other engine
  // (rule 6 — chatgpt/gemini only, grok/perplexity/copilot out of scope)
  // renders from a harvested-just-now row when this run's on-demand harvest
  // covered it, else from the newest banked snapshot, else "missing". Only
  // ever looks up a snapshot for an engine in ENGINE_ORDER — a bank file
  // can still carry an old grok/perplexity/copilot snapshot from before
  // they were dropped from product scope, and it's silently ignored here
  // rather than erroring. Don't add per-engine validation on
  // category.snapshots; that tolerance is intentional.
  const engineData = { claude: doneRuns.map((r) => ({ ...r, collected_on: "live", source: "live" })) };
  for (const engine of ENGINE_ORDER) {
    if (engine === "claude") continue;
    engineData[engine] = finalQueries.map((q) => {
      const harvested = harvestedByEngineQid.get(`${engine}:${q.qid}`);
      if (harvested) {
        return {
          qid: q.qid,
          text: q.text,
          archetype: q.archetype,
          recs: harvested.slice(0, 5).map((rec) => ({
            brand: rec.brand || "",
            product: rec.product || "",
            why: rec.why || "",
            destination: rec.destination || "none",
            destination_domain: rec.destination_domain || "",
          })),
          collected_on: today,
          source: "live-harvest",
        };
      }
      const snaps = allSnapshots.filter((s) => s.qid === q.qid && s.engine === engine);
      // 3-way comparator (0 on ties) so the pick is deterministic under
      // JS's stable sort — a 1/-1-only comparator never reports equal dates
      // as equal, which made the "latest" pick effectively arbitrary
      // whenever two snapshots (e.g. a bank seed and a same-day Supabase
      // write-through) shared a collected_on.
      const latest = snaps.sort((a, b) => (a.collected_on > b.collected_on ? -1 : a.collected_on < b.collected_on ? 1 : 0))[0];
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

  // The personalized branded-routing question ("where can I buy genuine
  // {brand}...") always surfaces the brand by construction — it isn't
  // testing whether AI organically recommends you. Excluded from appearance
  // rate / Share of Voice / per-engine scores / verdict; it only feeds the
  // checkout-destination analysis below (computeReport's engineData param,
  // which stays the full set). From the RAW liveRuns (done + error), not
  // the filtered scoring data — a failed live call must show up as
  // "couldn't complete," never silently shrink the denominator the same
  // way a real "not recommended" would.
  const organicLiveRuns = liveRuns.filter((r) => r.archetype !== "branded-routing");
  const organicScoringEngineData = Object.fromEntries(
    Object.entries(scoringEngineData).map(([engine, rows]) => [
      engine,
      rows.filter((r) => r.archetype !== "branded-routing"),
    ])
  );
  const appearanceSummary = computeAppearanceSummary(organicLiveRuns, brandName);

  const report = computeReport({
    market,
    brand: brandName,
    competitor: competitorName,
    brandWebsite: brandWebsiteInput,
    engineData: scoringEngineData,
    organicEngineData: organicScoringEngineData,
    appearanceSummary,
  });

  const categoryOut = { id: category.id, name: category.name, group: category.group };
  const fanout = computeFanout(liveRuns);
  const trustedSources = computeTrustedSources(liveRuns);

  // Every completed test is saved (slug "{brand}-{category}-{shortid}"),
  // gate or no gate — components/test/report/ReportView.js's blur-lock is a
  // client-side presentational layer over this same data, not a
  // server-side redaction, so there's nothing sensitive about persisting
  // the full report up front. Best-effort: a save failure (or Supabase not
  // configured) just means no share link this time, never a failed test.
  const slug = await saveReport({
    market,
    categoryId: category.id,
    categoryName: category.name,
    brand: brandName,
    brandWebsite: brandWebsiteInput,
    reportData: {
      market,
      brand: brandName,
      competitor: competitorName || null,
      brandWebsite: brandWebsiteInput || null,
      category: categoryOut,
      isCustom: Boolean(customCategory),
      report,
      sentiment,
      mentionCount: mentions.length,
      engines: engineData,
      fanout,
      trustedSources,
    },
  });

  return NextResponse.json({
    ok: true,
    market,
    category: categoryOut,
    isCustom: Boolean(customCategory),
    brand: brandName,
    competitor: competitorName || null,
    brandWebsite: brandWebsiteInput || null,
    queries: finalQueries,
    liveRuns,
    engines: engineData,
    report,
    sentiment,
    mentionCount: mentions.length,
    fanout,
    trustedSources,
    slug,
    rateLimit,
  });
}

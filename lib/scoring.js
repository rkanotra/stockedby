// Scoring/telemetry helpers ported from docs/prototype-app.jsx. ENGINES is
// widened from the prototype's 4-engine constant to the 6 test engines in
// CLAUDE.md hard rule 6 (Perplexity + Copilot render from harvested
// snapshots only, same as ChatGPT/Gemini/Grok — never live).
export const ENGINES = ["claude", "chatgpt", "gemini", "grok", "perplexity", "copilot"];

export const ENGINE_LABELS = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  grok: "Grok",
  perplexity: "Perplexity",
  copilot: "Copilot",
};

export const RIVALS = {
  India: ["amazon", "flipkart", "meesho", "myntra", "nykaa"],
  UAE: ["amazon", "noon", "namshi", "carrefour"],
  KSA: ["amazon", "noon", "jarir", "extra"],
};

export const RIVAL_LABELS = {
  India: "Flipkart/Amazon",
  UAE: "Noon/Amazon",
  KSA: "Amazon/Jarir",
};

// Founder-facing labels — no jargon ("brand-direct" -> "Own site").
export const DEST_LABELS = {
  "brand-direct": "Own site",
  marketplace: "Marketplace",
  aggregator: "Comparison site",
  none: "No link",
};

export const ARCH_LABELS = {
  "category-discovery": "discovery",
  "branded-routing": "routing",
  "problem-first": "problem-first",
  replacement: "replacement",
};

export const rankPoints = (idx) => Math.max(0, 100 - idx * 20);

export const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const matches = (a, b) => {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return false;
  return y.includes(x) || x.includes(y);
};

export function isRivalFor(market) {
  const rivalNames = RIVALS[market] || ["amazon"];
  return (candidate) => {
    const n = normalize(candidate);
    return rivalNames.some((r) => n.includes(r));
  };
}

// Normalizes a user-entered brand website ("https://boat-lifestyle.com/shop",
// "www.boat-lifestyle.com", "boat-lifestyle.com") down to a bare hostname.
export function normalizeDomain(input) {
  if (!input) return "";
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, "");
  } catch {
    return trimmed.replace(/^www\./, "").replace(/\/.*$/, "");
  }
}

export function domainsMatch(a, b) {
  const x = normalizeDomain(a);
  const y = normalizeDomain(b);
  if (!x || !y) return false;
  return x === y || x.endsWith(`.${y}`) || y.endsWith(`.${x}`);
}

function scoreFor(rows, matchFn) {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => {
    const idx = r.recs.findIndex((rec) => matchFn(rec.brand) || matchFn(rec.product));
    return sum + (idx >= 0 ? rankPoints(idx) : 0);
  }, 0);
  return Math.round(total / rows.length);
}

// The true shape of the live test: how many shopper questions were actually
// attempted, how many completed vs. failed, and where the brand appeared
// among the ones that did complete. Computed from raw liveRuns (status
// done/error) — NOT the scoring-filtered engineData, which only ever sees
// successful rows and would silently shrink the denominator to whatever
// happened to work (a failed live call is not the same as "not recommended").
export function computeAppearanceSummary(liveRuns, brand) {
  const completedRuns = liveRuns.filter((r) => r.status === "done");
  const failedRuns = liveRuns.filter((r) => r.status === "error");

  let appearedIn = 0;
  let bestRank = null;
  completedRuns.forEach((r) => {
    const idx = r.recs.findIndex((rec) => matches(brand, rec.brand) || matches(brand, rec.product));
    if (idx >= 0) {
      appearedIn++;
      const rank = idx + 1;
      if (bestRank === null || rank < bestRank) bestRank = rank;
    }
  });

  return {
    totalAttempted: liveRuns.length,
    completed: completedRuns.length,
    failed: failedRuns.length,
    failedQueries: failedRuns.map((r) => ({ qid: r.qid, text: r.text, archetype: r.archetype })),
    appearedIn,
    appearanceRate: completedRuns.length ? appearedIn / completedRuns.length : 0,
    bestRank,
  };
}

// engineData: { claude: rows[], chatgpt: rows[], ... }. Each row:
// { qid, text, archetype, recs: [{brand,product,why,destination,destination_domain}], collected_on, source }
// appearanceSummary: from computeAppearanceSummary(liveRuns, brand) — drives
// the verdict tier. Required in practice (the caller always has liveRuns by
// the time it can compute a report at all); falls back to NOT STOCKED if
// omitted rather than throwing.
export function computeReport({ market, brand, competitor, brandWebsite, engineData, appearanceSummary }) {
  const isRival = isRivalFor(market);
  const hasComp = Boolean(competitor && competitor.trim());
  const brandDomain = normalizeDomain(brandWebsite);

  const allRows = ENGINES.flatMap((e) => engineData[e] || []);

  let slotYou = 0;
  let slotComp = 0;
  let slotRival = 0;
  let slotOther = 0;
  let slotTotal = 0;
  const destTally = { "brand-direct": 0, marketplace: 0, aggregator: 0, none: 0 };
  const yourDest = {};

  allRows.forEach((r) =>
    r.recs.forEach((rec) => {
      slotTotal++;
      const isYou = matches(brand, rec.brand) || matches(brand, rec.product);
      if (isYou) slotYou++;
      else if (hasComp && (matches(competitor, rec.brand) || matches(competitor, rec.product))) slotComp++;
      else if (isRival(rec.brand)) slotRival++;
      else slotOther++;

      let dkey = DEST_LABELS[rec.destination] ? rec.destination : "none";
      // A recommendation of you that links to your own declared website is a
      // brand-direct win, regardless of how the engine classified the link.
      if (isYou && brandDomain && domainsMatch(rec.destination_domain, brandDomain)) {
        dkey = "brand-direct";
      }
      destTally[dkey]++;
      if (isYou) {
        const dom = rec.destination_domain || DEST_LABELS[dkey];
        if (!yourDest[dom]) yourDest[dom] = { domain: dom, count: 0, destination: dkey };
        yourDest[dom].count++;
      }
    })
  );

  const pct = (n) => (slotTotal ? Math.round((n / slotTotal) * 100) : 0);
  const yourDestList = Object.values(yourDest).sort((a, b) => b.count - a.count);

  const engineScores = ENGINES.map((e) => {
    const rows = engineData[e] || [];
    return {
      engine: e,
      rows: rows.length,
      you: scoreFor(rows, (c) => matches(brand, c)),
      rival: scoreFor(rows, isRival),
    };
  });

  const scoredEngines = engineScores.filter((s) => s.you !== null);
  const avgYou = scoredEngines.length
    ? Math.round(scoredEngines.reduce((a, s) => a + s.you, 0) / scoredEngines.length)
    : 0;
  const avgRival = scoredEngines.length
    ? Math.round(scoredEngines.reduce((a, s) => a + s.rival, 0) / scoredEngines.length)
    : 0;
  // Verdict tiers (4): appearing rarely is disqualifying on its own — a
  // brand that showed up in 1 of 4 completed questions shouldn't read as
  // fully "ON THE SHELF" just because its one appearance out-ranked the
  // rival average. NOT STOCKED (never appeared) < BARELY STOCKED (appeared,
  // but in under half of completed questions) < OUTSHELVED (appears often
  // enough, but ranks below the rival average) < ON THE SHELF.
  const appeared = appearanceSummary?.appearedIn ?? 0;
  const appearanceRate = appearanceSummary?.appearanceRate ?? 0;
  let verdict;
  if (appeared === 0) {
    verdict = "NOT STOCKED";
  } else if (appearanceRate < 0.5) {
    verdict = "BARELY STOCKED";
  } else if (avgYou >= avgRival) {
    verdict = "ON THE SHELF";
  } else {
    verdict = "OUTSHELVED";
  }

  const appearRows = allRows.filter((r) =>
    r.recs.some((rec) => matches(brand, rec.brand) || matches(brand, rec.product))
  ).length;

  return {
    verdict,
    avgYou,
    avgRival,
    appearRows,
    totalRows: allRows.length,
    scoredEngineCount: scoredEngines.length,
    appearanceSummary: appearanceSummary || null,
    engineScores,
    shareOfVoice: {
      you: pct(slotYou),
      competitor: hasComp ? pct(slotComp) : null,
      rival: pct(slotRival),
      other: pct(slotOther),
      slotTotal,
    },
    destinations: {
      tally: destTally,
      pct: Object.fromEntries(Object.entries(destTally).map(([k, v]) => [k, pct(v)])),
      yourDestinations: yourDestList,
    },
  };
}

// Query fanout: the literal web searches Claude ran, deduped.
export function computeFanout(liveRuns) {
  return [...new Set(liveRuns.flatMap((r) => r.searches || []))];
}

// One founder-plain-English sentence for the top of the report — synthesizes
// the verdict with the single most common place AI sends this brand's own
// buyers to check out.
export function buildFounderSummary({ brand, appearanceSummary, topDestination }) {
  if (!appearanceSummary || appearanceSummary.appearedIn === 0) {
    return `AI isn't recommending ${brand} yet in these shopper questions.`;
  }
  if (!topDestination) {
    return `AI recommends ${brand}, but doesn't say where buyers should check out.`;
  }
  if (topDestination.destination === "brand-direct") {
    return `AI recommends ${brand} and sends buyers straight to your own site — no commission lost.`;
  }
  const place = topDestination.destination === "marketplace" ? "a marketplace" : "a comparison site";
  return `AI recommends ${brand} but sends your buyers to ${topDestination.domain} — ${place}, where you pay commission on every sale.`;
}

// Trusted sources: domains cited across live Claude runs, ranked.
export function computeTrustedSources(liveRuns, topN = 8) {
  const tally = {};
  liveRuns.forEach((r) => (r.citations || []).forEach((d) => (tally[d] = (tally[d] || 0) + 1)));
  return Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

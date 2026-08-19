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
  GCC: ["amazon", "noon", "namshi"],
};

export const DEST_LABELS = {
  "brand-direct": "Brand-direct",
  marketplace: "Marketplace",
  aggregator: "Aggregator",
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

function scoreFor(rows, matchFn) {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => {
    const idx = r.recs.findIndex((rec) => matchFn(rec.brand) || matchFn(rec.product));
    return sum + (idx >= 0 ? rankPoints(idx) : 0);
  }, 0);
  return Math.round(total / rows.length);
}

// engineData: { claude: rows[], chatgpt: rows[], ... }. Each row:
// { qid, text, archetype, recs: [{brand,product,why,destination,destination_domain}], collected_on, source }
export function computeReport({ market, brand, competitor, engineData }) {
  const isRival = isRivalFor(market);
  const hasComp = Boolean(competitor && competitor.trim());

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

      const dkey = DEST_LABELS[rec.destination] ? rec.destination : "none";
      destTally[dkey]++;
      if (isYou) {
        const dom = rec.destination_domain || DEST_LABELS[dkey];
        yourDest[dom] = (yourDest[dom] || 0) + 1;
      }
    })
  );

  const pct = (n) => (slotTotal ? Math.round((n / slotTotal) * 100) : 0);
  const yourDestList = Object.entries(yourDest).sort((a, b) => b[1] - a[1]);

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
  const verdict = avgYou === 0 ? "NOT STOCKED" : avgYou >= avgRival ? "ON THE SHELF" : "OUTSHELVED";
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

// Trusted sources: domains cited across live Claude runs, ranked.
export function computeTrustedSources(liveRuns, topN = 8) {
  const tally = {};
  liveRuns.forEach((r) => (r.citations || []).forEach((d) => (tally[d] = (tally[d] || 0) + 1)));
  return Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

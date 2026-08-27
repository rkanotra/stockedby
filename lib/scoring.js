// The canonical engine lineup + iteration order — every engine tab,
// scorebox, and per-engine loop in the app derives from this single list
// (CLAUDE.md hard rule 6). Grok, Perplexity and Copilot are out of product
// scope entirely, not just hidden — see lib/bank.js for why a bank file can
// still carry their snapshots without erroring (ignored, not fabricated
// support). Claude is the only live engine; ChatGPT and Gemini are
// API-harvested (scripts/harvest.py) or manually harvested.
export const ENGINE_ORDER = ["chatgpt", "gemini", "claude"];

export const ENGINE_LABELS = {
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  claude: "Claude",
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

// Display name for the canonical market key ("KSA" reads as "Saudi
// Arabia" everywhere it's shown to a merchant — the internal key itself
// stays "KSA" to match data/ksa.json + lib/bank.js).
export const MARKET_LABELS = { India: "India", UAE: "UAE", KSA: "Saudi Arabia" };

// Per-market fill-ins for on-demand custom-category query generation
// (lib/claudeClient.js generateCustomQueries, app/api/generate-queries) —
// same currency/local-language pairing as docs/stockedby-data-kit.md §2b's
// fill-in table (India -> INR/hi-en; GCC -> AED or SAR/ar).
export const MARKET_LOCALE = {
  India: { currencyLabel: "INR (₹)", languageCode: "hi-en", languageLabel: "Hinglish" },
  UAE: { currencyLabel: "AED", languageCode: "ar", languageLabel: "Gulf Arabic" },
  KSA: { currencyLabel: "SAR", languageCode: "ar", languageLabel: "Saudi-dialect Arabic" },
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

// Defensive decode for any string that MIGHT be percent-encoded — e.g. a
// domain read from a URL query param. Browsers/Next already decode a query
// param once, but a double-encoded link (encodeURIComponent applied to an
// already-encoded value, or a pasted URL that was itself encoded) leaves a
// literal "%20" in the string. Guards against decodeURIComponent throwing
// on a stray "%" that isn't a valid escape (e.g. a brand genuinely
// containing "%") by falling back to the input unchanged, and is bounded so
// a pathological string can't loop forever — stops as soon as decoding
// stops changing anything.
export function safeDecode(input, maxPasses = 3) {
  let value = input || "";
  for (let i = 0; i < maxPasses; i++) {
    let decoded;
    try {
      decoded = decodeURIComponent(value);
    } catch {
      return value;
    }
    if (decoded === value) break;
    value = decoded;
  }
  return value;
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

// Rough first guess at a brand name from a domain ("beminimalist.co" ->
// "Beminimalist", "the-nice-shop.in" -> "The Nice Shop") for the /test
// wizard's domain-first flow — components/test/BrandStep.js always shows
// this as an editable field, never a final answer, so an imperfect guess
// (multi-level domains, non-brand subdomains) is an acceptable tradeoff for
// one less screen to fill in by hand. safeDecode() first in case a raw
// percent-encoded value reaches this function directly (defense in depth —
// callers should already decode values read from URL params before they
// get here, see components/test/TestFlow.js and app/audit|fix/page.js).
//
// IMPORTANT: this guess is genuinely the ONLY place in the app a brand
// name is ever derived from something slug-like rather than typed by the
// merchant — everywhere downstream (query text sent to the AI engines,
// the saved report, the merchant email, the PDF) just renders whatever
// TestFlow.js's `brand` state currently holds, which is this guess UNLESS
// the merchant edits BrandStep's field. A domain can never contain a
// literal "&" — a brand like "Dot & Key" registering "dotandkey.com" or
// "dot-and-key.com" is a real, common pattern — so a hyphenated "and"
// segment is treated as standing in for one ("dot-and-key.com" ->
// "Dot & Key", not "Dot And Key"). A merchant who doesn't correct a bad
// guess here has it sent to the engines as their literal brand name,
// which can produce a false "not recommended" verdict if the real brand
// name doesn't match closely enough for the model to recognize it.
export function guessBrandFromDomain(input) {
  const domain = normalizeDomain(safeDecode(input));
  if (!domain) return "";
  const parts = domain.split(".");
  const stem = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
  const words = stem
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean);
  if (words.length === 0) return "";
  // A real domain never contains a literal space — if the stem has one, the
  // "domain" was actually a decoded phrase (a merchant pasted their brand
  // name, or an upstream link got double-encoded), not a hyphenated
  // multi-word hostname like "the-nice-shop.in". Indian D2C brands
  // overwhelmingly register domains as one joined word ("mamaearth.in", not
  // "mama-earth.in"), so prefer the joined form over a space-separated
  // title case in that case ("Mama earth" -> "Mamaearth", not "Mama Earth").
  if (/\s/.test(stem)) {
    const joined = words.join("").toLowerCase();
    return joined[0].toUpperCase() + joined.slice(1);
  }
  return words
    .map((w) => (w.toLowerCase() === "and" ? "&" : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

// "when shoppers ask about {category}" — category names are stored
// sentence-case ("Hair oil (cold-pressed / ayurvedic)", data/*.json's own
// display name), which reads fine as a standalone label but wrong
// capitalized mid-sentence. Lowercases just the first letter, UNLESS it's
// part of a leading acronym ("TWS earbuds" — the only current example
// across all three markets), which stays as-is either way.
export function categoryMidSentence(name) {
  if (!name) return name;
  if (name.length > 1 && name[0] === name[0].toUpperCase() && name[1] === name[1].toUpperCase()) {
    return name;
  }
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export function domainsMatch(a, b) {
  const x = normalizeDomain(a);
  const y = normalizeDomain(b);
  if (!x || !y) return false;
  return x === y || x.endsWith(`.${y}`) || y.endsWith(`.${x}`);
}

// Known marketplace domains, misclassified by the model often enough (as
// "aggregator"/"Comparison site", sometimes even "brand-direct") to need a
// hard override rather than trusting the self-report. "Comparison site" is
// reserved for domains actually built around comparing/aggregating listings
// — not a catch-all for anything the model didn't recognize.
const KNOWN_MARKETPLACE_ROOTS = [
  "nykaa.com",
  "purplle.com",
  "tirabeauty.com",
  "myntra.com",
  "flipkart.com",
  "noon.com",
  "namshi.com",
  "jarir.com",
  "extra.com",
];

function matchesRoot(domain, root) {
  return domain === root || domain.endsWith(`.${root}`);
}

function isAmazonDomain(domain) {
  // amazon.* — amazon.in, amazon.ae, amazon.sa, amazon.com, amazon.co.uk, ...
  return domain === "amazon" || domain.startsWith("amazon.") || domain.includes(".amazon.");
}

export function overrideDestinationForDomain(domain) {
  const d = normalizeDomain(domain);
  if (!d) return null;
  if (isAmazonDomain(d)) return "marketplace";
  if (KNOWN_MARKETPLACE_ROOTS.some((root) => matchesRoot(d, root))) return "marketplace";
  return null;
}

// The destination a rec should actually be classified as: the merchant's own
// declared website wins outright (only meaningful for their own recs), then
// the known-marketplace override, then whatever the engine/snapshot itself
// reported.
export function effectiveDestination(rec, { isYou, brandDomain } = {}) {
  if (isYou && brandDomain && domainsMatch(rec.destination_domain, brandDomain)) {
    return "brand-direct";
  }
  return overrideDestinationForDomain(rec.destination_domain) || (DEST_LABELS[rec.destination] ? rec.destination : "none");
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

// engineData / organicEngineData: { claude: rows[], chatgpt: rows[], ... }.
// Each row: { qid, text, archetype, recs: [{brand,product,why,destination,
// destination_domain}], collected_on, source }
//
// The personalized branded-routing question ("where can I buy genuine
// {brand}...") always surfaces the brand by construction — it isn't asking
// whether AI recommends you, it already assumes the answer is you. Mixing
// its guaranteed appearance into appearance rate / Share of Voice / per-
// engine scores would inflate all four, so those are computed from
// organicEngineData (every archetype except branded-routing) while the
// checkout-destination analysis (where AI actually sends a buyer who
// already chose you) is computed from the full engineData, since that
// question is the whole point of the checkout numbers.
//
// appearanceSummary: from computeAppearanceSummary(organicLiveRuns, brand)
// — drives the verdict tier. Required in practice; falls back to NOT
// STOCKED if omitted rather than throwing.
export function computeReport({
  market,
  brand,
  competitor,
  brandWebsite,
  engineData,
  organicEngineData,
  appearanceSummary,
}) {
  const isRival = isRivalFor(market);
  const hasComp = Boolean(competitor && competitor.trim());
  const brandDomain = normalizeDomain(brandWebsite);

  // ---- Share of Voice + per-engine scores: organic questions only ----
  const organicRows = ENGINE_ORDER.flatMap((e) => organicEngineData[e] || []);

  let slotYou = 0;
  let slotComp = 0;
  let slotRival = 0;
  let slotOther = 0;
  let slotTotal = 0;

  organicRows.forEach((r) =>
    r.recs.forEach((rec) => {
      slotTotal++;
      const isYou = matches(brand, rec.brand) || matches(brand, rec.product);
      if (isYou) slotYou++;
      else if (hasComp && (matches(competitor, rec.brand) || matches(competitor, rec.product))) slotComp++;
      else if (isRival(rec.brand)) slotRival++;
      else slotOther++;
    })
  );
  const sovPct = (n) => (slotTotal ? Math.round((n / slotTotal) * 100) : 0);

  const engineScores = ENGINE_ORDER.map((e) => {
    const rows = organicEngineData[e] || [];
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

  const appearRows = organicRows.filter((r) =>
    r.recs.some((rec) => matches(brand, rec.brand) || matches(brand, rec.product))
  ).length;

  // ---- Checkout battle: every question, including the routing one ----
  // (routing is the one guaranteed to surface a real destination for you)
  const destinationRows = ENGINE_ORDER.flatMap((e) => engineData[e] || []);
  const destTally = { "brand-direct": 0, marketplace: 0, aggregator: 0, none: 0 };
  const yourDest = {};
  let destTotal = 0;

  destinationRows.forEach((r) =>
    r.recs.forEach((rec) => {
      destTotal++;
      const isYou = matches(brand, rec.brand) || matches(brand, rec.product);
      const dkey = effectiveDestination(rec, { isYou, brandDomain });
      destTally[dkey]++;
      if (isYou) {
        const dom = rec.destination_domain || DEST_LABELS[dkey];
        if (!yourDest[dom]) yourDest[dom] = { domain: dom, count: 0, destination: dkey };
        yourDest[dom].count++;
      }
    })
  );
  const destPct = (n) => (destTotal ? Math.round((n / destTotal) * 100) : 0);
  const yourDestList = Object.values(yourDest).sort((a, b) => b.count - a.count);

  return {
    verdict,
    avgYou,
    avgRival,
    appearRows,
    totalRows: organicRows.length,
    scoredEngineCount: scoredEngines.length,
    appearanceSummary: appearanceSummary || null,
    engineScores,
    shareOfVoice: {
      you: sovPct(slotYou),
      competitor: hasComp ? sovPct(slotComp) : null,
      rival: sovPct(slotRival),
      other: sovPct(slotOther),
      slotTotal,
    },
    destinations: {
      tally: destTally,
      pct: Object.fromEntries(Object.entries(destTally).map(([k, v]) => [k, destPct(v)])),
      yourDestinations: yourDestList,
    },
  };
}

// Query fanout: the literal web searches Claude ran, deduped.
export function computeFanout(liveRuns) {
  return [...new Set(liveRuns.flatMap((r) => r.searches || []))];
}

// One founder-plain-English sentence for the top of the report. Built
// entirely from the same numbers the rest of the report shows (appearance
// summary + the checkout battle's own yourDestinations list) so it can
// never say something the destination table itself contradicts.
export function buildFounderSummary({ brand, category, appearanceSummary, yourDestinations }) {
  const appeared = appearanceSummary?.appearedIn ?? 0;

  if (appeared === 0) {
    const cat = category ? ` when shoppers ask about ${categoryMidSentence(category)}` : "";
    return `AI isn't recommending ${brand} yet${cat} — competitors are taking every slot.`;
  }

  const total = appearanceSummary.totalAttempted;
  let lead = `AI recommends ${brand} in ${appeared} of ${total} organic question${total === 1 ? "" : "s"}`;
  if (appearanceSummary.bestRank) lead += `, best rank #${appearanceSummary.bestRank}`;

  const destTotal = (yourDestinations || []).reduce((sum, d) => sum + d.count, 0);
  if (destTotal === 0) return `${lead}.`;

  const ownSite = yourDestinations
    .filter((d) => d.destination === "brand-direct")
    .reduce((sum, d) => sum + d.count, 0);
  const majorityOwnSite = ownSite / destTotal > 0.5;

  if (majorityOwnSite) {
    return `${lead}, and sends buyers to your site — no commission lost.`;
  }

  const topOther = yourDestinations.find((d) => d.destination !== "brand-direct");
  if (!topOther) return `${lead}.`;
  return `${lead}, but sends buyers to ${topOther.domain} — you pay commission on sales AI wins for you.`;
}

// Trusted sources: domains cited across live Claude runs, ranked.
export function computeTrustedSources(liveRuns, topN = 8) {
  const tally = {};
  liveRuns.forEach((r) => (r.citations || []).forEach((d) => (tally[d] = (tally[d] || 0) + 1)));
  return Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
}

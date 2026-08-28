import { MARKET_PROFILES, allMarketplaceDomains } from "./marketProfiles.js";

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

// The four constants below used to be independently hardcoded here — they
// now derive from lib/marketProfiles.js, the single source of truth for
// every market's data (market-expansion phase). Kept as named exports so
// every existing importer (lib/email.js, lib/pdf/buildReportPdf.js,
// components/) needs zero changes — only the literals moved.
function deriveMarketMap(fieldOrFn) {
  const fn = typeof fieldOrFn === "function" ? fieldOrFn : (p) => p[fieldOrFn];
  return Object.fromEntries(Object.entries(MARKET_PROFILES).map(([market, p]) => [market, fn(p)]));
}

export const RIVALS = deriveMarketMap((p) => p.rivalNames);
export const RIVAL_LABELS = deriveMarketMap("rivalLabel");

// Display name for the canonical market key ("KSA" reads as "Saudi
// Arabia" everywhere it's shown to a merchant — the internal key itself
// stays "KSA" to match data/ksa.json + lib/bank.js).
export const MARKET_LABELS = deriveMarketMap("countryName");

// Per-market fill-ins for on-demand custom-category query generation
// (lib/claudeClient.js generateCustomQueries, app/api/generate-queries) —
// same currency/local-language pairing as docs/stockedby-data-kit.md §2b's
// fill-in table.
export const MARKET_LOCALE = deriveMarketMap((p) => ({
  currencyLabel: p.currencyLabel,
  languageCode: p.languageCode,
  languageLabel: p.languageLabel,
}));

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

// Punctuation stripped as WORD BREAKS (a space), not deleted outright —
// "Dr. Sheth's" must become "dr sheth s", not "drsheths" run together with
// the next real word, or a genuinely different two-word brand could
// collide with it. "&" is handled separately below (converted to the word
// "and" first) so it isn't just silently dropped here.
const BRAND_PUNCTUATION_RE = /[.'’\-,"()/]/g;

// Trailing corporate/geo suffixes, stripped as whole trailing words only
// (never mid-string) — "X Pvt Ltd" strips both in one pass.
const BRAND_SUFFIXES = new Set(["india", "pvt", "ltd", "inc", "co"]);

// The one shared brand-comparison util (root-caused a real production bug:
// a brand's own report reading NOT STOCKED, 0 of 3, while that same brand
// ranked #1 with 3 mentions in its own leaders table — the OLD normalize()
// stripped "&" and all whitespace with nothing to replace them, so "Dot &
// Key" -> "dotkey" while a merchant-typed/guessed "Dot and Key" ->
// "dotandkey"; neither is a substring of the other, so matches() silently
// returned false and the brand scored zero). Handles, in order: unicode
// NFKD + diacritic stripping, lowercasing, "&" <-> "and" (both directions
// converge here since "&" becomes the literal word "and"), the punctuation
// list above as word breaks, trailing corporate-suffix words, then
// whitespace collapsed away entirely for the final comparison key (matches()
// below is intentionally substring-based, not exact-equality, so e.g. "The
// Derma Co" ("thederma" after its own trailing "co" strips) still contains
// "derma" from "Derma Co" once "co" strips there too).
export function normalizeBrand(s) {
  if (!s) return "";
  // Same combining-diacritical-marks range lib/reports.js's slugify() uses.
  let t = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  t = t.toLowerCase().trim();
  t = t.replace(/&/g, " and ");
  t = t.replace(BRAND_PUNCTUATION_RE, " ");
  const words = t.split(/\s+/).filter(Boolean);
  while (words.length > 1 && BRAND_SUFFIXES.has(words[words.length - 1])) {
    words.pop();
  }
  return words.join("");
}

// normalize() stays the general-purpose name for what every existing
// caller across the app already imports (buildTopBrands, computeReport's
// isYou/isRival checks, isRivalFor, EngineTabs.js's "you" tag, ...) — it's
// just normalizeBrand() under the hood now, so every comparison in the app
// gets the fix above without having to hunt down and touch every call site.
export const normalize = normalizeBrand;

export const matches = (a, b) => {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return false;
  return y.includes(x) || x.includes(y);
};

// matches(a, b) plus any known alternate names for `b` — the "test
// record"'s optional brand_aliases (a brand also commonly known by a name
// no normalization rule could ever bridge, e.g. an unrelated abbreviation)
// escape hatch. Safe to call with aliases undefined/empty; behaves exactly
// like matches() then.
export const matchesAny = (candidate, brand, aliases) => {
  if (matches(candidate, brand)) return true;
  return (aliases || []).some((alias) => matches(candidate, alias));
};

// Defensive cleanup for a raw brand/product label as returned by an AI
// engine, applied at the one place a raw rec.brand/rec.product becomes
// display text (lib/layerOne.js's buildTopBrands) so every "leaders"-style
// surface (lib/founderReport.js's buildTopBrands, the PDF, ShelvesCard) gets it without re-deriving it
// per component. Audited every JSON-parsing and rendering path in this app
// (lib/claudeClient.js's extractJSON, scripts/harvest.py's extract_json,
// every brand-rendering component, every CSS content: rule, and an
// empirical pdfkit word-wrap test) and found no code here that inserts a
// "/" — rec.brand/rec.product passes through completely unmodified
// end to end in both the live-Claude and offline-harvest paths, so a
// stray "/" (e.g. "Dr. /Sheth's") most likely reflects the engine's own
// raw output. This strips the one visually-confusing pattern that's
// actually cheap and safe to clean up — "X. /Y" -> "X. Y" — without
// touching a genuine, intentional "/" elsewhere in a label (e.g. "Brooklinen
// / Quince / West Elm", a real multi-brand answer already in the bank).
export function sanitizeBrandLabel(s) {
  if (!s) return s;
  return s.replace(/\.\s*\/\s*/g, ". ").replace(/\s+/g, " ").trim();
}

// components/test/RunningPanel.js's per-engine card status — the one
// shared function both the first run and the recheck screen use, exactly
// two states (no confusing third "checking live now…" middle state,
// which read as backwards for chatgpt/gemini when they were actually the
// ones being live-harvested): an engine actually being asked right now —
// Claude always, or a stale chatgpt/gemini this run will on-demand
// harvest — reads "checking now", same wording Claude already used
// correctly; everything else reads "using recent answers".
export function engineStatusLabel(engine, harvestingEngines = []) {
  const isLive = engine === "claude" || harvestingEngines.includes(engine);
  return isLive ? "checking now" : "using recent answers";
}

export function isRivalFor(market) {
  const rivalNames = RIVALS[market] || ["amazon"];
  return (candidate) => {
    const n = normalize(candidate);
    return rivalNames.some((r) => n.includes(r));
  };
}

// Partial-failure handling (VerdictCard.js): whether ONE more completed
// question — best or worst case — could move the appearance rate across
// the 0.5 tier boundary computeReport()'s verdict logic uses (BARELY
// STOCKED vs. ON THE SHELF/OUTSHELVED), or whether it could turn a
// current zero into a first appearance (flipping NOT STOCKED). A failed
// question that couldn't possibly change the outcome either way gets no
// extra UI at all — only a genuinely undecided one does.
export function couldChangeVerdict(appearanceSummary) {
  const { appearedIn = 0, completed = 0, failed = 0 } = appearanceSummary || {};
  if (!failed) return false;
  if (!completed) return true;
  if (appearedIn === 0) return true;
  const rate = appearedIn / completed;
  const bestCase = (appearedIn + 1) / (completed + 1);
  const worstCase = appearedIn / (completed + 1);
  return (rate < 0.5 && bestCase >= 0.5) || (rate >= 0.5 && worstCase < 0.5);
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
// — not a catch-all for anything the model didn't recognize. Derived from
// every market profile's marketplaces[]/retailersByCategory{} instead of a
// separately hardcoded list, so a new market's retailers are automatically
// recognized here the moment they're added to lib/marketProfiles.js.
const KNOWN_MARKETPLACE_ROOTS = allMarketplaceDomains();

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
  if (isYou && brandDomain && domainsMatch(rec?.destination_domain, brandDomain)) {
    return "brand-direct";
  }
  return overrideDestinationForDomain(rec?.destination_domain) || (DEST_LABELS[rec?.destination] ? rec.destination : "none");
}

function scoreFor(rows, matchFn) {
  if (rows.length === 0) return null;
  const total = rows.reduce((sum, r) => {
    const idx = r.recs.findIndex((rec) => matchFn(rec?.brand) || matchFn(rec?.product));
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
    const idx = r.recs.findIndex((rec) => matches(brand, rec?.brand) || matches(brand, rec?.product));
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
      const isYou = matches(brand, rec?.brand) || matches(brand, rec?.product);
      if (isYou) slotYou++;
      else if (hasComp && (matches(competitor, rec?.brand) || matches(competitor, rec?.product))) slotComp++;
      else if (isRival(rec?.brand)) slotRival++;
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
  // appearRows: does the brand appear ANYWHERE across all three engines'
  // organic data — computed before the verdict decision below (it used to
  // be computed after, and unused by it — see that decision's own comment
  // for why that was a real bug).
  const appearRows = organicRows.filter((r) =>
    r.recs.some((rec) => matches(brand, rec?.brand) || matches(brand, rec?.product))
  ).length;

  // Verdict tiers (4): appearing rarely is disqualifying on its own — a
  // brand that showed up in 1 of 4 completed questions shouldn't read as
  // fully "ON THE SHELF" just because its one appearance out-ranked the
  // rival average. NOT STOCKED (never appeared) < BARELY STOCKED (appeared,
  // but in under half of completed questions) < OUTSHELVED (appears often
  // enough, but ranks below the rival average) < ON THE SHELF.
  //
  // `appeared`/`appearanceRate` come from appearanceSummary, which is
  // computed from Claude's LIVE run only (lib/runQueries.js — ChatGPT/
  // Gemini are never re-asked live, only read from a cached snapshot; see
  // app/api/test/route.js). Gating "NOT STOCKED" on `appeared === 0` alone
  // was a real bug: a brand ChatGPT or Gemini's snapshot recommended could
  // still read NOT STOCKED whenever Claude specifically didn't mention it
  // THIS run — directly contradicting the report's own "leaders" list
  // (lib/layerOne.js's buildTopBrands, which scans all three engines), and
  // the actual root cause of app/api/test/route.js's contradiction guard
  // firing constantly — not on a rare data bug, but on ordinary,
  // expected disagreement between engines. NOT STOCKED now requires the
  // brand to be absent from BOTH Claude's live run AND every other
  // engine's organic data; `appearanceRate` (still Claude-only, since it's
  // what drives the live-question retry flow) naturally reads 0 in that
  // fallthrough case, landing on BARELY STOCKED instead.
  const appeared = appearanceSummary?.appearedIn ?? 0;
  const appearanceRate = appearanceSummary?.appearanceRate ?? 0;
  let verdict;
  if (appeared === 0 && appearRows === 0) {
    verdict = "NOT STOCKED";
  } else if (appearanceRate < 0.5) {
    verdict = "BARELY STOCKED";
  } else if (avgYou >= avgRival) {
    verdict = "ON THE SHELF";
  } else {
    verdict = "OUTSHELVED";
  }

  // ---- Checkout battle: every question, including the routing one ----
  // (routing is the one guaranteed to surface a real destination for you)
  const destinationRows = ENGINE_ORDER.flatMap((e) => engineData[e] || []);
  const destTally = { "brand-direct": 0, marketplace: 0, aggregator: 0, none: 0 };
  const yourDest = {};
  let destTotal = 0;

  destinationRows.forEach((r) =>
    r.recs.forEach((rec) => {
      destTotal++;
      const isYou = matches(brand, rec?.brand) || matches(brand, rec?.product);
      const dkey = effectiveDestination(rec, { isYou, brandDomain });
      destTally[dkey]++;
      if (isYou) {
        const dom = rec?.destination_domain || DEST_LABELS[dkey];
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
  let lead = `AI recommends ${brand} in ${appeared} of ${total} question${total === 1 ? "" : "s"}`;
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

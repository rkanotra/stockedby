// Derived, founder-facing metrics for the redesigned /test report (see
// CLAUDE.md's "founder-first redesign" phase). Every function here reads
// ONLY from the same report/engines/appearanceSummary shape
// lib/scoring.js's computeReport() already produces and lib/reports.js
// persists as report_json — no new data collection, no schema change, and
// never a fabricated number (hard rule 2). Kept separate from
// lib/layerOne.js (the original founder layer, still used as a fallback
// and by a couple of legacy call sites) so this file can evolve with the
// report UI without touching it. lib/email.js and lib/pdf/buildReportPdf.js
// read the SAME functions here (not a re-derivation) so /test, the email,
// and the PDF can never disagree about a number.

import { ENGINE_ORDER, matches } from "./scoring.js";
import { buildTopBrands } from "./layerOne.js";

// ---------- AI Visibility Score ----------
// Reuses report.avgYou verbatim — the same rank-weighted 0-100 score
// (lib/scoring.js's rankPoints/scoreFor) the full report's per-engine
// boxes already show, just averaged across engines. Not a new metric —
// hard rule 2 forbids inventing one for the UI.
const SCORE_BANDS = [
  { max: 0, label: "Not visible" },
  { max: 29, label: "Weak" },
  { max: 54, label: "Growing" },
  { max: 79, label: "Competing" },
  { max: 100, label: "Strong" },
];

export function scoreBand(score) {
  const band = SCORE_BANDS.find((b) => score <= b.max);
  return band ? band.label : "Strong";
}

export function buildVisibilityScore(report) {
  const score = report?.avgYou ?? 0;
  return { score, band: scoreBand(score) };
}

// ---------- AI Buyer Journey: Discover -> Consider -> Buy ----------
// Maps the bank's real query archetypes onto a 3-stage funnel:
//   Discover = category-discovery (shopper doesn't know your brand yet,
//     asking "what's the best X")
//   Consider = problem-first + replacement (shopper is narrowing down —
//     describing a need, or comparing an existing pick)
//   Buy      = branded-routing (shopper already wants YOUR brand,
//     asking where to buy it)
// Each stage's percentage is a real appearance rate — rows of that
// archetype, across every engine with real (non-"missing") data, where
// the brand actually appears in the recs. Never invented; `rows`/
// `matched` ride along so a caller can show "2 of 4" style detail too.
const STAGE_ARCHETYPES = {
  discover: ["category-discovery"],
  consider: ["problem-first", "replacement"],
  buy: ["branded-routing"],
};
const STAGE_LABELS = { discover: "Discover", consider: "Consider", buy: "Buy" };

function stageStats(engines, brand, archetypes) {
  let rows = 0;
  let matched = 0;
  ENGINE_ORDER.forEach((engine) => {
    (engines?.[engine] || []).forEach((row) => {
      if (row.source === "missing") return;
      if (!archetypes.includes(row.archetype)) return;
      rows += 1;
      const hit = (row.recs || []).some((rec) => rec && (matches(brand, rec.brand) || matches(brand, rec.product)));
      if (hit) matched += 1;
    });
  });
  const pct = rows > 0 ? Math.round((matched / rows) * 100) : null;
  return { rows, matched, pct };
}

function stageBand(pct) {
  if (pct === null) return null;
  if (pct < 34) return "Weak";
  if (pct < 67) return "Growing";
  return "Strong";
}

export function buildBuyerJourney(engines, brand) {
  const stages = Object.entries(STAGE_ARCHETYPES).map(([key, archetypes]) => {
    const stats = stageStats(engines, brand, archetypes);
    return { key, label: STAGE_LABELS[key], ...stats, band: stageBand(stats.pct) };
  });

  // One-line conclusion: only stages with real data count, and it picks
  // whichever end is genuinely weaker/stronger from the real numbers —
  // never assumes "weak at the top" as a default story.
  const withData = stages.filter((s) => s.pct !== null);
  let insight = null;
  if (withData.length >= 2) {
    const strongest = withData.reduce((a, b) => (b.pct > a.pct ? b : a));
    const weakest = withData.reduce((a, b) => (b.pct < a.pct ? b : a));
    insight =
      strongest.key !== weakest.key && strongest.pct - weakest.pct >= 20
        ? `You're strongest at ${strongest.label.toLowerCase()} but weak at ${weakest.label.toLowerCase()}.`
        : "Your AI visibility is fairly even across the buying journey.";
  }

  return { stages, insight };
}

// ---------- Biggest opportunity ----------
// The single most actionable gap: whichever buyer-journey stage is
// weakest AND actually has data, phrased with the real competitor
// beating them there when one exists. Never invents a stage or a reason.
export function buildBiggestOpportunity({ buyerJourney, topOthers, brand }) {
  const withData = buyerJourney.stages.filter((s) => s.pct !== null);
  if (withData.length === 0) return null;

  const weakest = withData.reduce((a, b) => (b.pct < a.pct ? b : a));
  const leadCompetitor = (topOthers || [])[0] || null;

  if (weakest.pct === 0) {
    const title =
      weakest.key === "discover"
        ? "Win shoppers before they choose a brand"
        : weakest.key === "buy"
        ? "Show up when shoppers already want you"
        : "Get considered once shoppers start comparing";
    return {
      stage: weakest.key,
      stageLabel: weakest.label,
      title,
      detail: leadCompetitor
        ? `${leadCompetitor.label} currently wins the highest-intent ${weakest.label.toLowerCase()} searches.`
        : `AI isn't recommending ${brand} yet at the ${weakest.label.toLowerCase()} stage.`,
    };
  }

  return {
    stage: weakest.key,
    stageLabel: weakest.label,
    title: `Strengthen your ${weakest.label.toLowerCase()} stage`,
    detail: leadCompetitor
      ? `${leadCompetitor.label} is recommended more often at this stage.`
      : `${brand} appears in only ${weakest.pct}% of ${weakest.label.toLowerCase()} questions.`,
  };
}

// ---------- Competitor threat ----------
// Reuses buildTopBrands' tally (the same "who does AI recommend" scan
// the report's leaders list already uses) for who the biggest competitor
// is; adds their average rank position — a real number, computed the
// same way lib/scoring.js's rankPoints scoring works (1-indexed position
// in each row's recs where they appear) — and how many of the DISTINCT
// shopper questions (deduped by qid across engines, not raw row count)
// they were recommended in. Never picks a "biggest competitor" off a
// single response — this is a real cross-question, cross-engine tally.
export function buildCompetitorThreat(engines, brand) {
  const { topOthers } = buildTopBrands(engines, brand, 5);
  if (topOthers.length === 0) return null;

  const leader = topOthers[0];
  const qidsSeen = new Set();
  const qidsWithLeader = new Set();
  let totalRank = 0;
  let rankCount = 0;

  ENGINE_ORDER.forEach((engine) => {
    (engines?.[engine] || []).forEach((row) => {
      if (row.archetype === "branded-routing" || row.source === "missing") return;
      qidsSeen.add(row.qid);
      const idx = (row.recs || []).findIndex((rec) => rec && matches(leader.label, rec.brand || rec.product));
      if (idx >= 0) {
        qidsWithLeader.add(row.qid);
        totalRank += idx + 1;
        rankCount += 1;
      }
    });
  });

  return {
    label: leader.label,
    appearedIn: qidsWithLeader.size,
    totalQuestions: qidsSeen.size,
    avgRank: rankCount > 0 ? Math.round((totalRank / rankCount) * 10) / 10 : null,
    others: topOthers.slice(1, 4),
  };
}

// ---------- Where AI sends customers: own site vs marketplace ----------
// Re-buckets the report's own 4-way destination tally (report.destinations
// .tally: brand-direct/marketplace/aggregator/none) into the two numbers
// that actually matter to a founder — "none" (no link given at all) is
// excluded from the percentage base, same as lib/layerOne.js's
// buildDestinationStory, so it doesn't silently pad either side. Returns
// null (never a forced 50/50) when there's no real destination data at
// all — the UI shows "we couldn't reliably determine this" instead.
export function buildDestinationSplit(destinations) {
  const tally = destinations?.tally || {};
  const ownSite = tally["brand-direct"] || 0;
  const marketplace = (tally.marketplace || 0) + (tally.aggregator || 0);
  const total = ownSite + marketplace;
  if (total === 0) return null;
  return {
    ownSitePct: Math.round((ownSite / total) * 100),
    marketplacePct: Math.round((marketplace / total) * 100),
    ownSiteCount: ownSite,
    marketplaceCount: marketplace,
  };
}

// ---------- Where AI sends customers, per engine ----------
// Same own-site-vs-marketplace routing detection as buildDestinationSplit,
// just run once per engine over lib/scoring.js's new
// report.destinationsByEngine — "does ChatGPT route buyers to marketplaces
// more than Claude does" is a real, differently-actionable finding a single
// combined split can't show. Only includes an engine that actually has real
// destination data (never a forced 0/0 split); returns null (not `{}`) when
// no engine has any, so a caller can treat "no per-engine breakdown" and
// "no destination data at all" the same way it already treats
// buildDestinationSplit's null.
export function buildDestinationSplitByEngine(destinationsByEngine) {
  if (!destinationsByEngine) return null;
  const out = {};
  Object.entries(destinationsByEngine).forEach(([engine, data]) => {
    const split = buildDestinationSplit(data);
    if (split) out[engine] = split;
  });
  return Object.keys(out).length > 0 ? out : null;
}

// ---------- What should you do next: up to 3 specific actions ----------
// Grounded in the same signals as this file's other functions — never a
// generic "improve SEO." Skips a candidate entirely rather than padding
// it with a fabricated reason when the data doesn't support one.
export function buildFounderActions({ buyerJourney, biggestOpportunity, competitorThreat, destinationSplit, brand }) {
  const items = [];

  if (biggestOpportunity) {
    const isStrengthen = biggestOpportunity.title.startsWith("Strengthen");
    items.push({
      title:
        biggestOpportunity.stage === "discover"
          ? "Win generic category searches"
          : biggestOpportunity.stage === "buy"
          ? "Show up when shoppers already want you"
          : "Strengthen your comparison positioning",
      detail:
        competitorThreat && isStrengthen
          ? `${competitorThreat.label} is recommended more often than ${brand} when shoppers are at the ${biggestOpportunity.stageLabel.toLowerCase()} stage.`
          : biggestOpportunity.detail,
      impact: "High impact",
    });
  }

  if (destinationSplit && destinationSplit.marketplacePct > destinationSplit.ownSitePct) {
    items.push({
      title: "Send more AI shoppers to your own site",
      detail: `${destinationSplit.marketplacePct}% of AI's purchase recommendations currently point to a marketplace, not you.`,
      impact: "Medium impact",
    });
  }

  const weakStages = buyerJourney.stages.filter(
    (s) => s.pct !== null && s.band === "Weak" && s.key !== biggestOpportunity?.stage
  );
  if (weakStages.length > 0) {
    const stage = weakStages[0];
    items.push({
      title: `Strengthen your ${stage.label.toLowerCase()} stage`,
      detail: `AI recommends ${brand} in only ${stage.pct}% of ${stage.label.toLowerCase()} questions.`,
      impact: "Medium impact",
    });
  }

  return items.slice(0, 3);
}

// One call for the whole redesigned report — mirrors lib/layerOne.js's
// buildLayerOne() shape/spirit, just for this new set of derived metrics.
// Pure and deterministic: the same report/engines/brand always produce
// the same result, so /test, the merchant email, and the PDF (all three
// call this) can never silently disagree about a number.
export function buildFounderReport({ report, engines, brand }) {
  const visibility = buildVisibilityScore(report);
  const buyerJourney = buildBuyerJourney(engines, brand);
  const { topOthers } = buildTopBrands(engines, brand, 5);
  const biggestOpportunity = buildBiggestOpportunity({ buyerJourney, topOthers, brand });
  const competitorThreat = buildCompetitorThreat(engines, brand);
  const destinationSplit = buildDestinationSplit(report?.destinations);
  const destinationSplitByEngine = buildDestinationSplitByEngine(report?.destinationsByEngine);
  const actions = buildFounderActions({ buyerJourney, biggestOpportunity, competitorThreat, destinationSplit, brand });

  return {
    visibility,
    buyerJourney,
    biggestOpportunity,
    competitorThreat,
    destinationSplit,
    destinationSplitByEngine,
    actions,
  };
}

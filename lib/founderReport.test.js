import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildVisibilityScore,
  buildBuyerJourney,
  buildBiggestOpportunity,
  buildCompetitorThreat,
  buildDestinationSplit,
  buildFounderActions,
  buildFounderReport,
} from "./founderReport.js";

function rec(brand, extra = {}) {
  return { brand, product: "", why: "", destination: "none", destination_domain: "", ...extra };
}

function row(qid, archetype, recs, source = "live") {
  return { qid, archetype, recs, source };
}

test("buildVisibilityScore: reuses report.avgYou verbatim, never invents a number", () => {
  assert.deepEqual(buildVisibilityScore({ avgYou: 42 }), { score: 42, band: "Growing" });
  assert.deepEqual(buildVisibilityScore({ avgYou: 0 }), { score: 0, band: "Not visible" });
  assert.deepEqual(buildVisibilityScore({ avgYou: 85 }), { score: 85, band: "Strong" });
  assert.deepEqual(buildVisibilityScore(null), { score: 0, band: "Not visible" });
});

test("buildBuyerJourney: computes real per-archetype appearance rates, not fabricated ones", () => {
  const engines = {
    claude: [
      row("q1", "category-discovery", [rec("Rival")]),
      row("q2", "problem-first", [rec("Brand")]),
      row("q3", "branded-routing", [rec("Brand")]),
    ],
    chatgpt: [row("q1", "category-discovery", [rec("Rival")])],
    gemini: [],
  };
  const { stages, insight } = buildBuyerJourney(engines, "Brand");
  const discover = stages.find((s) => s.key === "discover");
  const consider = stages.find((s) => s.key === "consider");
  const buy = stages.find((s) => s.key === "buy");

  assert.equal(discover.rows, 2);
  assert.equal(discover.matched, 0);
  assert.equal(discover.pct, 0);
  assert.equal(consider.pct, 100);
  assert.equal(buy.pct, 100);
  assert.ok(insight.includes("discover"));
});

test("buildBuyerJourney: a stage with zero rows reads null, not a fabricated 0%", () => {
  const { stages } = buildBuyerJourney({ claude: [] }, "Brand");
  stages.forEach((s) => {
    assert.equal(s.pct, null);
    assert.equal(s.band, null);
  });
});

test("buildBiggestOpportunity: names the real leading competitor at the real weakest stage", () => {
  const buyerJourney = {
    stages: [
      { key: "discover", label: "Discover", pct: 0, rows: 2, matched: 0, band: "Weak" },
      { key: "consider", label: "Consider", pct: 100, rows: 1, matched: 1, band: "Strong" },
      { key: "buy", label: "Buy", pct: 100, rows: 1, matched: 1, band: "Strong" },
    ],
  };
  const opp = buildBiggestOpportunity({ buyerJourney, topOthers: [{ label: "Minimalist", count: 3 }], brand: "Brand" });
  assert.equal(opp.stage, "discover");
  assert.ok(opp.detail.includes("Minimalist"));
});

test("buildBiggestOpportunity: never names a competitor that doesn't exist in the data", () => {
  const buyerJourney = { stages: [{ key: "discover", label: "Discover", pct: 0, rows: 1, matched: 0, band: "Weak" }] };
  const opp = buildBiggestOpportunity({ buyerJourney, topOthers: [], brand: "Brand" });
  assert.ok(!opp.detail.includes("undefined"));
  assert.ok(opp.detail.includes("Brand"));
});

test("buildBiggestOpportunity: no data at all -> null, not a guess", () => {
  const opp = buildBiggestOpportunity({ buyerJourney: { stages: [{ key: "discover", pct: null, label: "Discover" }] }, topOthers: [], brand: "Brand" });
  assert.equal(opp, null);
});

test("buildCompetitorThreat: real appearance count and average rank, deduped by question not row", () => {
  const engines = {
    claude: [
      row("q1", "category-discovery", [rec("Minimalist"), rec("Brand")]),
      row("q2", "category-discovery", [rec("Brand"), rec("Minimalist")]),
    ],
    chatgpt: [row("q1", "category-discovery", [rec("Minimalist")])],
    gemini: [],
  };
  const threat = buildCompetitorThreat(engines, "Brand");
  assert.equal(threat.label, "Minimalist");
  // Minimalist appears in q1 (claude rank1, chatgpt rank1) and q2 (claude rank2) -> 2 distinct questions.
  assert.equal(threat.totalQuestions, 2);
  assert.equal(threat.appearedIn, 2);
  // ranks: 1 (q1 claude), 1 (q1 chatgpt), 2 (q2 claude) -> avg (1+1+2)/3 = 1.33... rounded to 1 decimal
  assert.equal(threat.avgRank, 1.3);
});

test("buildCompetitorThreat: no other brand ever mentioned -> null", () => {
  const engines = { claude: [row("q1", "category-discovery", [rec("Brand")])] };
  assert.equal(buildCompetitorThreat(engines, "Brand"), null);
});

test("buildDestinationSplit: excludes 'none' from the percentage base", () => {
  const split = buildDestinationSplit({ tally: { "brand-direct": 3, marketplace: 3, aggregator: 0, none: 10 } });
  assert.equal(split.ownSitePct, 50);
  assert.equal(split.marketplacePct, 50);
});

test("buildDestinationSplit: no real destination data at all -> null", () => {
  assert.equal(buildDestinationSplit({ tally: { "brand-direct": 0, marketplace: 0, aggregator: 0, none: 5 } }), null);
});

test("buildFounderActions: caps at 3, every item traceable to real input, no generic filler", () => {
  const buyerJourney = {
    stages: [
      { key: "discover", label: "Discover", pct: 0, band: "Weak" },
      { key: "consider", label: "Consider", pct: 20, band: "Weak" },
      { key: "buy", label: "Buy", pct: 100, band: "Strong" },
    ],
  };
  const biggestOpportunity = { stage: "discover", stageLabel: "Discover", title: "Win shoppers before they choose a brand", detail: "Minimalist currently wins the highest-intent discover searches." };
  const competitorThreat = { label: "Minimalist", appearedIn: 3, totalQuestions: 4, avgRank: 1.7, others: [] };
  const destinationSplit = { ownSitePct: 30, marketplacePct: 70, ownSiteCount: 3, marketplaceCount: 7 };

  const actions = buildFounderActions({ buyerJourney, biggestOpportunity, competitorThreat, destinationSplit, brand: "Brand" });
  assert.ok(actions.length <= 3);
  assert.ok(actions.length >= 2);
  actions.forEach((a) => {
    assert.ok(a.title.length > 0);
    assert.ok(a.detail.length > 0);
    assert.ok(["High impact", "Medium impact"].includes(a.impact));
  });
});

test("buildFounderReport: end-to-end, never throws on a small realistic dataset, and is deterministic", () => {
  const engines = {
    claude: [
      row("q1", "category-discovery", [rec("Minimalist"), rec("CosRx")]),
      row("q2", "problem-first", [rec("Brand")]),
      row("q3", "branded-routing", [rec("Brand", { destination: "marketplace", destination_domain: "amazon.in" })]),
    ],
    chatgpt: [row("q1", "category-discovery", [rec("Minimalist")])],
    gemini: [],
  };
  const report = {
    avgYou: 42,
    destinations: { tally: { "brand-direct": 1, marketplace: 1, aggregator: 0, none: 0 } },
  };
  assert.doesNotThrow(() => buildFounderReport({ report, engines, brand: "Brand" }));
  const a = buildFounderReport({ report, engines, brand: "Brand" });
  const b = buildFounderReport({ report, engines, brand: "Brand" });
  assert.deepEqual(a, b);
  assert.equal(a.visibility.score, 42);
  assert.ok(a.actions.length > 0);
});

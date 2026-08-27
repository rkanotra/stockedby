import { test } from "node:test";
import assert from "node:assert/strict";
import { stageStatus, buildAuditHeadline, buildAuditJourney, buildCrawlerSummary } from "./journey.js";

test("stageStatus: thresholds, unknown/null never reads as pass", () => {
  assert.equal(stageStatus(null), "Not checked");
  assert.equal(stageStatus(0), "Not ready");
  assert.equal(stageStatus(29), "Not ready");
  assert.equal(stageStatus(30), "Needs work");
  assert.equal(stageStatus(69), "Needs work");
  assert.equal(stageStatus(70), "Ready");
  assert.equal(stageStatus(100), "Ready");
});

test("buildAuditHeadline: all ready -> positive headline", () => {
  const stages = [
    { key: "find", status: "Ready" },
    { key: "understand", status: "Ready" },
    { key: "buy", status: "Ready" },
  ];
  assert.equal(buildAuditHeadline(stages), "Your store is ready for AI shopping.");
});

test("buildAuditHeadline: Find blocked dominates, regardless of the other two", () => {
  const stages = [
    { key: "find", status: "Not ready" },
    { key: "understand", status: "Ready" },
    { key: "buy", status: "Ready" },
  ];
  assert.equal(buildAuditHeadline(stages), "Some AI platforms may struggle to access your store.");
});

test("buildAuditHeadline: Find+Understand ready, Buy not -> forward-looking headline, not an alarm", () => {
  const stages = [
    { key: "find", status: "Ready" },
    { key: "understand", status: "Ready" },
    { key: "buy", status: "Not ready" },
  ];
  assert.equal(
    buildAuditHeadline(stages),
    "Your store is discoverable and readable, but isn't ready for agent-driven purchasing yet."
  );
});

test("buildAuditHeadline: genuinely different combinations produce different headlines (not one fixed string)", () => {
  const allReady = buildAuditHeadline([{ key: "find", status: "Ready" }, { key: "understand", status: "Ready" }, { key: "buy", status: "Ready" }]);
  const findBlocked = buildAuditHeadline([{ key: "find", status: "Not ready" }, { key: "understand", status: "Ready" }, { key: "buy", status: "Ready" }]);
  const understandWeak = buildAuditHeadline([{ key: "find", status: "Ready" }, { key: "understand", status: "Not ready" }, { key: "buy", status: "Ready" }]);
  const set = new Set([allReady, findBlocked, understandWeak]);
  assert.equal(set.size, 3);
});

test("buildAuditJourney: maps discoverable/readable/transactable scores onto Find/Understand/Buy directly", () => {
  const result = {
    layers: {
      discoverable: { score: 80 },
      readable: { score: 20 },
      transactable: { score: null },
    },
  };
  const { stages } = buildAuditJourney(result);
  assert.equal(stages.find((s) => s.key === "find").status, "Ready");
  assert.equal(stages.find((s) => s.key === "understand").status, "Not ready");
  assert.equal(stages.find((s) => s.key === "buy").status, "Not checked");
});

test("buildCrawlerSummary: groups 6 bot checks into 4 platform buckets, restricted vs accessible", () => {
  const checks = [
    { id: "robots-GPTBot", status: "fail" },
    { id: "robots-OAI-SearchBot", status: "pass" },
    { id: "robots-Google-Extended", status: "pass" },
    { id: "robots-ClaudeBot", status: "pass" },
    { id: "robots-anthropic-ai", status: "pass" },
    { id: "robots-PerplexityBot", status: "pass" },
  ];
  const summary = buildCrawlerSummary(checks);
  assert.equal(summary.groups.length, 4);
  // OpenAI group restricted because GPTBot fails, even though OAI-SearchBot passes.
  assert.equal(summary.restricted.length, 1);
  assert.equal(summary.restricted[0].platform, "OpenAI");
  assert.equal(summary.accessible.length, 3);
});

test("buildCrawlerSummary: no matching checks at all -> no group falsely marked restricted", () => {
  const summary = buildCrawlerSummary([]);
  assert.equal(summary.restricted.length, 0);
  assert.equal(summary.accessible.length, 4);
});

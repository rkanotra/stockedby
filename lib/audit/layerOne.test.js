import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAuditLayerOne } from "./layerOne.js";

// Root-cause coverage for a real production bug: a giant green "YES, AI
// CAN READ YOUR SHOP" rendered directly above a "what's wrong" card
// saying AI can't see product prices, because the verdict was a SEPARATE
// average-of-scores computation from the findings list and the two could
// disagree. Both now read the same checks array.

const passingChecks = [
  { id: "robots-GPTBot", layer: "discoverable", status: "pass" },
  { id: "llms-txt", layer: "discoverable", status: "pass" },
  { id: "homepage-schema", layer: "readable", status: "pass" },
  { id: "product-schema", layer: "readable", status: "pass" },
];

function withStatus(checks, id, status) {
  return checks.map((c) => (c.id === id ? { ...c, status } : c));
}

test("buildAuditLayerOne: every check passing -> green, no findings", () => {
  const r = buildAuditLayerOne({ checks: passingChecks });
  assert.equal(r.verdict, "YES, AI CAN READ YOUR SHOP");
  assert.deepEqual(r.findings, []);
  assert.equal(r.contradiction, false);
});

test("buildAuditLayerOne: robots blocked -> red, never green with findings present", () => {
  const checks = withStatus(passingChecks, "robots-GPTBot", "fail");
  const r = buildAuditLayerOne({ checks });
  assert.equal(r.verdict, "AI CAN'T READ YOUR SHOP");
  assert.ok(r.findings.length > 0);
});

test("buildAuditLayerOne: homepage unreadable -> red", () => {
  const checks = withStatus(passingChecks, "homepage-schema", "fail");
  const r = buildAuditLayerOne({ checks });
  assert.equal(r.verdict, "AI CAN'T READ YOUR SHOP");
});

test("buildAuditLayerOne: reachable + readable, but product data missing -> amber, matches the reported bug", () => {
  const checks = withStatus(passingChecks, "product-schema", "fail");
  const r = buildAuditLayerOne({ checks });
  assert.equal(r.verdict, "AI CAN READ YOUR SHOP, BUT NOT YOUR PRODUCTS");
  assert.ok(r.findings.some((f) => f.finding.toLowerCase().includes("product")));
});

test("buildAuditLayerOne: product-schema 'warn' (incomplete, not fully failed) also reads amber", () => {
  const checks = withStatus(passingChecks, "product-schema", "warn");
  const r = buildAuditLayerOne({ checks });
  assert.equal(r.verdict, "AI CAN READ YOUR SHOP, BUT NOT YOUR PRODUCTS");
});

test("buildAuditLayerOne: a lone llms.txt failure (not blocked, not product-related) still isn't green", () => {
  const checks = withStatus(passingChecks, "llms-txt", "fail");
  const r = buildAuditLayerOne({ checks });
  assert.notEqual(r.verdict, "YES, AI CAN READ YOUR SHOP");
  assert.ok(r.findings.length > 0);
});

test("buildAuditLayerOne: contradiction guard never lets findings coexist with the green verdict, across many combinations", () => {
  const ids = ["robots-GPTBot", "llms-txt", "homepage-schema", "product-schema"];
  const statuses = ["pass", "fail", "warn"];
  for (const id of ids) {
    for (const status of statuses) {
      const checks = withStatus(passingChecks, id, status);
      const r = buildAuditLayerOne({ checks });
      if (r.findings.length > 0) {
        assert.notEqual(r.verdict, "YES, AI CAN READ YOUR SHOP", `${id}=${status} produced a contradictory green verdict`);
      }
    }
  }
});

test("buildAuditLayerOne: the transactable layer never affects the Layer 1 verdict (still roadmap)", () => {
  const checks = [...passingChecks, { id: "payment-signal", layer: "transactable", status: "fail" }];
  const r = buildAuditLayerOne({ checks });
  assert.equal(r.verdict, "YES, AI CAN READ YOUR SHOP");
  assert.deepEqual(r.findings, []);
});

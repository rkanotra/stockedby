import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreProduct, scoreStore, productTier, READY_THRESHOLD, BLOCKED_THRESHOLD } from "./readiness.js";
import { normalizeProduct } from "./normalizeProduct.js";
import { buildRecommendations } from "./recommendations.js";

function fullyReadyProduct(overrides = {}) {
  return normalizeProduct({
    id: 1,
    title: "Vitamin C Face Serum",
    handle: "vitamin-c-face-serum",
    body_html: "<p>A lightweight vitamin C serum for brightening dull, tired-looking skin every morning.</p>",
    product_type: "Skincare",
    tags: "skincare,serum,vitamin-c",
    status: "active",
    images: [{ src: "https://example.com/a.jpg" }],
    variants: [{ id: 1, sku: "SKU-1", price: "19.99", inventory_management: "shopify", inventory_quantity: 10 }],
    ...overrides,
  });
}

test("scoreProduct: a fully complete product scores 100 across all three layers", () => {
  const score = scoreProduct(fullyReadyProduct());
  assert.equal(score.overall, 100);
  assert.equal(score.discoverable, 100);
  assert.equal(score.readable, 100);
  assert.equal(score.transactable, 100);
  assert.equal(score.tier, "ready");
  assert.deepEqual(score.failedChecks, []);
});

test("scoreProduct: a blank product scores 0 and every check fails, never a guessed partial", () => {
  const score = scoreProduct(normalizeProduct({ id: 1 }));
  assert.equal(score.overall, 0);
  assert.equal(score.tier, "blocked");
  assert.equal(score.failedChecks.length, 10);
});

test("scoreProduct: missing only price/availability drags down transactable specifically, not the other layers", () => {
  const product = fullyReadyProduct({ variants: [{ id: 1, sku: "SKU-1" }] }); // no price, no inventory tracking
  const score = scoreProduct(product);
  assert.equal(score.discoverable, 100);
  assert.equal(score.readable, 100);
  assert.ok(score.transactable < 100);
  assert.ok(score.failedChecks.some((c) => c.code === "has_price"));
  assert.ok(score.failedChecks.some((c) => c.code === "has_availability"));
});

test("productTier: thresholds match the exported constants exactly, no off-by-one", () => {
  assert.equal(productTier(READY_THRESHOLD), "ready");
  assert.equal(productTier(READY_THRESHOLD - 1), "needs_work");
  assert.equal(productTier(BLOCKED_THRESHOLD), "needs_work");
  assert.equal(productTier(BLOCKED_THRESHOLD - 1), "blocked");
});

test("scoreStore: zero products -> null scores and empty issues, never a fabricated 0", () => {
  const result = scoreStore([]);
  assert.equal(result.overall, null);
  assert.equal(result.productCount, 0);
  assert.deepEqual(result.issues, []);
});

test("scoreStore: aggregates real per-product scores and groups failures into named issues, most-affected first", () => {
  const ready = fullyReadyProduct();
  // Missing description AND images: readable drops to 1/3 (33%), pulling
  // overall to 78 — genuinely below READY_THRESHOLD (needs_work), not just
  // a cosmetic ding to one layer.
  const needsWork1 = fullyReadyProduct({ id: 2, title: "Product B", body_html: "", images: [] });
  const needsWork2 = fullyReadyProduct({ id: 3, title: "Product C", body_html: "", images: [] });
  // Missing price AND availability (no inventory info at all) drops
  // transactable to 2/4 (50%), but overall (83) still clears the ready
  // threshold — a real illustration that one weak layer doesn't
  // automatically fail the whole product, only degrades that layer's own
  // number and its own named issue.
  const missingPricing = fullyReadyProduct({ id: 4, title: "Product D", variants: [{ id: 1, sku: "SKU-4" }] });

  const result = scoreStore([ready, needsWork1, needsWork2, missingPricing]);

  assert.equal(result.productCount, 4);
  assert.equal(result.readyCount, 2); // ready + missingPricing (83 still >= READY_THRESHOLD)
  assert.equal(result.needsWorkCount, 2); // needsWork1 + needsWork2 (78 < READY_THRESHOLD)
  assert.equal(result.blockedCount, 0);

  const descriptionIssue = result.issues.find((i) => i.code === "has_description");
  const priceIssue = result.issues.find((i) => i.code === "has_price");
  assert.equal(descriptionIssue.affectedCount, 2);
  assert.equal(priceIssue.affectedCount, 1);
  // Most-affected issue sorts first.
  assert.equal(result.issues[0].code, "has_description");
});

test("scoreStore: issue example product titles never exceed 3, even with many affected products", () => {
  const products = Array.from({ length: 10 }, (_, i) => fullyReadyProduct({ id: i + 1, title: `Product ${i}`, body_html: "" }));
  const result = scoreStore(products);
  const issue = result.issues.find((i) => i.code === "has_description");
  assert.equal(issue.affectedCount, 10);
  assert.equal(issue.exampleProductTitles.length, 3);
});

test("buildRecommendations: capped at 5, sorted blocker-first, and never invents a recommendation for an unknown check code", () => {
  const storeScore = {
    issues: [
      { code: "has_tags", label: "no tags", affectedCount: 50, exampleProductTitles: [] },
      { code: "has_price", label: "no price", affectedCount: 2, exampleProductTitles: [] },
      { code: "some_unrecognized_future_check", label: "?", affectedCount: 99, exampleProductTitles: [] },
    ],
  };
  const recs = buildRecommendations(storeScore);
  assert.equal(recs.length, 2); // the unrecognized code is silently skipped, not guessed at
  assert.equal(recs[0].code, "has_price"); // blocker beats a minor issue with a far higher count
  assert.equal(recs[0].severity, "blocker");
  recs.forEach((r) => assert.ok(r.detail.length > 0));
});

test("buildRecommendations: no issues at all -> empty, never generic filler", () => {
  assert.deepEqual(buildRecommendations({ issues: [] }), []);
  assert.deepEqual(buildRecommendations(null), []);
});

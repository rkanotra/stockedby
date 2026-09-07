// AI Commerce Readiness Score (Phase 2) — deliberately mirrors lib/audit/
// score.js's Discoverable / Readable / Transactable framing (the same
// three questions the free /audit tool already asks about a merchant's
// whole site — hard rule/"reuse existing architecture") applied instead
// to a store's OWN Shopify catalog data, product by product:
//   Discoverable — can an AI agent even place/categorize this product
//     (a real URL handle, a product type, at least one tag)?
//   Readable — is there enough real content for an AI to describe it
//     accurately (title, description, images)?
//   Transactable — could an agent actually complete a purchase (a real
//     price, known availability, a unique SKU, published status)?
// Pure and deterministic — no network, no Supabase, no ai_observations
// (constraint: Phase 2 readiness must never depend on the Phase 1.5
// observation tables). Every check reads only lib/commerce/
// normalizeProduct.js's normalized shape; a field that's genuinely absent
// fails its check rather than being guessed (hard rule 2's spirit, same as
// every other scoring function in this app).

const DISCOVERABLE_CHECKS = [
  { code: "has_handle", label: "Missing a URL handle", test: (p) => Boolean(p.handle) },
  { code: "has_product_type", label: "No product type/category set", test: (p) => Boolean(p.productType) },
  { code: "has_tags", label: "No tags at all", test: (p) => p.tags.length > 0 },
];
const READABLE_CHECKS = [
  { code: "has_title", label: "Missing or too-short title", test: (p) => p.title.length >= 3 },
  { code: "has_description", label: "Little or no description", test: (p) => p.descriptionLength >= 40 },
  { code: "has_images", label: "No product images", test: (p) => p.images.length > 0 },
];
const TRANSACTABLE_CHECKS = [
  { code: "has_price", label: "No real price on any variant", test: (p) => p.variants.some((v) => v.price !== null && v.price > 0) },
  { code: "has_availability", label: "Availability/inventory unknown", test: (p) => p.variants.some((v) => v.available !== null) },
  { code: "has_unique_sku", label: "No unique SKU per variant", test: (p) => p.hasUniqueSkus },
  { code: "is_active", label: "Not published/active", test: (p) => p.status === "active" },
];

function runChecks(product, checks) {
  const results = checks.map((c) => ({ code: c.code, label: c.label, pass: Boolean(c.test(product)) }));
  const passCount = results.filter((r) => r.pass).length;
  const score = checks.length ? Math.round((passCount / checks.length) * 100) : 0;
  return { score, results };
}

// Product-level tiers, used both for the store-level tier counts below
// and (identically) for a single product's own badge in the dashboard's
// catalog table — one threshold set, one place, never two independently
// hand-tuned copies.
export const READY_THRESHOLD = 80;
export const BLOCKED_THRESHOLD = 40;

export function productTier(overallScore) {
  if (overallScore >= READY_THRESHOLD) return "ready";
  if (overallScore < BLOCKED_THRESHOLD) return "blocked";
  return "needs_work";
}

export function scoreProduct(product) {
  const discoverable = runChecks(product, DISCOVERABLE_CHECKS);
  const readable = runChecks(product, READABLE_CHECKS);
  const transactable = runChecks(product, TRANSACTABLE_CHECKS);
  const overall = Math.round((discoverable.score + readable.score + transactable.score) / 3);
  const failedChecks = [...discoverable.results, ...readable.results, ...transactable.results].filter((r) => !r.pass);
  return {
    overall,
    tier: productTier(overall),
    discoverable: discoverable.score,
    readable: readable.score,
    transactable: transactable.score,
    failedChecks,
  };
}

// Store-level aggregate + issue detection: groups every failed check
// across the whole catalog by CODE (a real, named failure pattern), most-
// affected first — one issue per pattern, never one row per product
// (a 500-product catalog missing descriptions is one issue, "312 products
// have no description," not 312 separate red rows — same "don't show a
// wall of red" spirit as hard rule 5's verdict-colour rule). Returns a
// null-scored, empty-issue shape for zero products rather than a
// fabricated 0 (hard rule 2).
export function scoreStore(products) {
  if (!products || products.length === 0) {
    return {
      overall: null,
      discoverable: null,
      readable: null,
      transactable: null,
      productCount: 0,
      readyCount: 0,
      needsWorkCount: 0,
      blockedCount: 0,
      issues: [],
      productScores: [],
    };
  }

  const productScores = products.map((product) => ({ product, score: scoreProduct(product) }));
  const avg = (values) => Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  let readyCount = 0;
  let needsWorkCount = 0;
  let blockedCount = 0;
  const byCode = new Map();

  productScores.forEach(({ product, score }) => {
    if (score.tier === "ready") readyCount += 1;
    else if (score.tier === "blocked") blockedCount += 1;
    else needsWorkCount += 1;

    score.failedChecks.forEach((check) => {
      if (!byCode.has(check.code)) {
        byCode.set(check.code, { code: check.code, label: check.label, affectedCount: 0, exampleProductTitles: [] });
      }
      const entry = byCode.get(check.code);
      entry.affectedCount += 1;
      if (entry.exampleProductTitles.length < 3 && product.title) entry.exampleProductTitles.push(product.title);
    });
  });

  return {
    overall: avg(productScores.map((s) => s.score.overall)),
    discoverable: avg(productScores.map((s) => s.score.discoverable)),
    readable: avg(productScores.map((s) => s.score.readable)),
    transactable: avg(productScores.map((s) => s.score.transactable)),
    productCount: products.length,
    readyCount,
    needsWorkCount,
    blockedCount,
    issues: [...byCode.values()].sort((a, b) => b.affectedCount - a.affectedCount),
    productScores,
  };
}

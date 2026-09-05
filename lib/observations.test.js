import { test } from "node:test";
import assert from "node:assert/strict";
import { buildObservationRows } from "./observations.js";

function rec(brand, extra = {}) {
  return { brand, product: "", why: "", destination: "none", destination_domain: "", ...extra };
}

const TEST_RUN_AT = "2026-09-05T12:00:00.000Z";

test("live Claude row: source_observed_at equals test_run_at (freshly observed now)", () => {
  const engineData = {
    claude: [{ qid: "q1", text: "best serum?", archetype: "category-discovery", language: "en", source: "live", recs: [rec("Brand")] }],
    chatgpt: [],
    gemini: [],
  };
  const rows = buildObservationRows({
    reportSlug: "brand-serum-abc123",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData,
    testRunAt: TEST_RUN_AT,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_type, "live");
  assert.equal(rows[0].source_observed_at, TEST_RUN_AT);
  assert.equal(rows[0].test_run_at, TEST_RUN_AT);
  assert.equal(rows[0].model_name, "claude-sonnet-4-6");
});

test("cached chatgpt/gemini row: source_observed_at is the ORIGINAL collection date, never test_run_at", () => {
  const engineData = {
    claude: [],
    chatgpt: [
      {
        qid: "q1",
        text: "best serum?",
        archetype: "category-discovery",
        recs: [rec("Brand")],
        collected_on: "2026-09-01", // 4 days before TEST_RUN_AT
        source: "snapshot",
        snapshotId: "abc-uuid",
      },
    ],
    gemini: [],
  };
  const rows = buildObservationRows({
    reportSlug: "brand-serum-abc123",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData,
    testRunAt: TEST_RUN_AT,
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].source_type, "cache");
  assert.equal(rows[0].source_observed_at, "2026-09-01T00:00:00.000Z");
  assert.notEqual(rows[0].source_observed_at, rows[0].test_run_at);
  assert.equal(rows[0].test_run_at, TEST_RUN_AT); // test_run_at is still "now"
  assert.equal(rows[0].model_name, null); // never assumed for a pre-existing snapshot
  assert.equal(rows[0].snapshot_id, "abc-uuid");
});

test("on-demand harvest row: genuinely fresh, source_observed_at equals test_run_at", () => {
  const engineData = {
    claude: [],
    chatgpt: [
      { qid: "q1", text: "best serum?", archetype: "category-discovery", recs: [rec("Brand")], collected_on: "2026-09-05", source: "live-harvest", snapshotId: "new-uuid" },
    ],
    gemini: [],
  };
  const rows = buildObservationRows({
    reportSlug: "brand-serum-abc123",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData,
    testRunAt: TEST_RUN_AT,
  });
  assert.equal(rows[0].source_type, "harvested");
  assert.equal(rows[0].source_observed_at, TEST_RUN_AT);
  assert.equal(rows[0].model_name, "gpt-4.1");
});

test("a 'missing' placeholder row is never logged as an observation", () => {
  const engineData = {
    claude: [],
    chatgpt: [{ qid: "q1", text: "best serum?", archetype: "category-discovery", recs: [], collected_on: null, source: "missing" }],
    gemini: [],
  };
  const rows = buildObservationRows({
    reportSlug: "brand-serum-abc123",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData,
    testRunAt: TEST_RUN_AT,
  });
  assert.equal(rows.length, 0);
});

test("determinism: identical input produces byte-identical rows, so a re-run/retry naturally dedupes at the DB unique constraint", () => {
  const engineData = {
    claude: [{ qid: "q1", text: "best serum?", archetype: "category-discovery", recs: [rec("Brand"), rec("Rival")], source: "live" }],
    chatgpt: [],
    gemini: [],
  };
  const args = {
    reportSlug: "brand-serum-abc123",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData,
    testRunAt: TEST_RUN_AT,
  };
  const a = buildObservationRows(args);
  const b = buildObservationRows(args);
  assert.deepEqual(a, b);
});

test("reusing the same cached snapshot across two different reports collapses to the same (engine, qid, source_observed_at) identity", () => {
  // Two different reports (different report_slug/testRunAt) both reading
  // the SAME still-fresh cached snapshot for this engine+qid — the row
  // brand_visibility_trend's distinct_obs CTE collapses on
  // (engine, qid, source_observed_at) must be identical across both, even
  // though the reports themselves ran at different times.
  const snapshotRow = { qid: "q1", text: "best serum?", archetype: "category-discovery", recs: [rec("Brand")], collected_on: "2026-09-01", source: "snapshot", snapshotId: "shared-uuid" };
  const rowsA = buildObservationRows({
    reportSlug: "report-a",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData: { claude: [], chatgpt: [snapshotRow], gemini: [] },
    testRunAt: "2026-09-02T09:00:00.000Z",
  });
  const rowsB = buildObservationRows({
    reportSlug: "report-b",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData: { claude: [], chatgpt: [snapshotRow], gemini: [] },
    testRunAt: "2026-09-03T17:00:00.000Z",
  });
  assert.equal(rowsA[0].engine, rowsB[0].engine);
  assert.equal(rowsA[0].qid, rowsB[0].qid);
  assert.equal(rowsA[0].source_observed_at, rowsB[0].source_observed_at);
  // ...even though the reports themselves are different and ran at
  // different times.
  assert.notEqual(rowsA[0].report_slug, rowsB[0].report_slug);
  assert.notEqual(rowsA[0].test_run_at, rowsB[0].test_run_at);
});

test("own-site vs marketplace destination is only ever computed from real data, never guessed when the brand didn't appear", () => {
  const engineData = {
    claude: [{ qid: "q1", text: "best serum?", archetype: "category-discovery", recs: [rec("SomeoneElse")], source: "live" }],
    chatgpt: [],
    gemini: [],
  };
  const rows = buildObservationRows({
    reportSlug: "brand-serum-abc123",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData,
    testRunAt: TEST_RUN_AT,
  });
  assert.equal(rows[0].appeared, false);
  assert.equal(rows[0].rank, null);
  assert.equal(rows[0].destination, null); // unknown stays unknown, never guessed
  assert.equal(rows[0].marketplace_name, null);
});

test("marketplace destination classification + marketplace_name label, and competitor detail, all from real recs", () => {
  const engineData = {
    claude: [
      {
        qid: "q1",
        text: "where can I buy this brand?",
        archetype: "branded-routing",
        recs: [rec("Rival", { destination: "brand-direct", destination_domain: "rival.com" }), rec("Brand", { destination: "marketplace", destination_domain: "amazon.in" })],
        source: "live",
      },
    ],
    chatgpt: [],
    gemini: [],
  };
  const rows = buildObservationRows({
    reportSlug: "brand-serum-abc123",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData,
    testRunAt: TEST_RUN_AT,
  });
  const row = rows[0];
  assert.equal(row.appeared, true);
  assert.equal(row.rank, 2);
  assert.equal(row.destination, "marketplace");
  assert.equal(row.marketplace_name, "Amazon");
  assert.equal(row.top_competitor, "Rival");
  assert.equal(row.top_competitor_domain, "rival.com");
  assert.equal(row.top_competitor_rank, 1);
  assert.equal(row.competitor_destination, "brand-direct");
  assert.equal(row.recommended_count, 2);
});

test("backfilled rows are distinguishable from live observations: forced source_type, no assumed model, provenance preserved", () => {
  const engineData = {
    claude: [{ qid: "q1", text: "best serum?", archetype: "category-discovery", recs: [rec("Brand")], source: "live" }],
  };
  const live = buildObservationRows({
    reportSlug: "brand-serum-abc123",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData,
    testRunAt: TEST_RUN_AT,
  })[0];
  const backfilled = buildObservationRows({
    reportSlug: "brand-serum-abc123",
    market: "India",
    categoryId: "face-serum",
    brand: "Brand",
    brandWebsite: "brand.com",
    engineData,
    testRunAt: TEST_RUN_AT,
    overrideSourceType: "backfill",
  })[0];

  assert.equal(live.source_type, "live");
  assert.equal(live.model_name, "claude-sonnet-4-6");

  assert.equal(backfilled.source_type, "backfill");
  assert.equal(backfilled.model_name, null); // never assumed for a reconstructed row
  assert.ok(backfilled.collection_method.startsWith("backfill-from-report-json:"));
  assert.ok(backfilled.collection_method.includes("claude-live-query")); // original method preserved for provenance
});

test("question_hash is deterministic and survives question wording being edited elsewhere", () => {
  const engineData = { claude: [{ qid: "q1", text: "Best face serum for oily skin?", archetype: "category-discovery", recs: [rec("Brand")], source: "live" }] };
  const a = buildObservationRows({ reportSlug: "r1", market: "India", categoryId: "c1", brand: "Brand", brandWebsite: "", engineData, testRunAt: TEST_RUN_AT })[0];
  const b = buildObservationRows({ reportSlug: "r2", market: "India", categoryId: "c1", brand: "Brand", brandWebsite: "", engineData, testRunAt: TEST_RUN_AT })[0];
  assert.equal(a.question_hash, b.question_hash);
  assert.equal(a.question_text, "Best face serum for oily skin?");
  assert.equal(a.question_hash.length, 16);
});

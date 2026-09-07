import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeProduct } from "./normalizeProduct.js";

test("normalizeProduct: strips HTML from body_html into plain description text", () => {
  const p = normalizeProduct({ id: 1, title: "Serum", body_html: "<p>Great <b>serum</b> for oily skin.</p>" });
  assert.equal(p.description, "Great serum for oily skin.");
  assert.equal(p.descriptionLength, p.description.length);
});

test("normalizeProduct: tags string splits into a clean array, never a single blob", () => {
  const p = normalizeProduct({ id: 1, tags: "skincare, vegan ,  cruelty-free" });
  assert.deepEqual(p.tags, ["skincare", "vegan", "cruelty-free"]);
});

test("normalizeProduct: missing tags/body_html/product_type never throw, default to empty", () => {
  const p = normalizeProduct({ id: 1, title: "Bare product" });
  assert.deepEqual(p.tags, []);
  assert.equal(p.description, "");
  assert.equal(p.productType, "");
  assert.deepEqual(p.images, []);
  assert.deepEqual(p.variants, []);
});

test("normalizeProduct: availability is only known when inventory is tracked or continue-selling is explicit — never guessed", () => {
  const tracked = normalizeProduct({ id: 1, variants: [{ id: 1, inventory_management: "shopify", inventory_quantity: 5 }] });
  assert.equal(tracked.variants[0].available, true);

  const outOfStock = normalizeProduct({ id: 1, variants: [{ id: 1, inventory_management: "shopify", inventory_quantity: 0 }] });
  assert.equal(outOfStock.variants[0].available, false);

  const continueSelling = normalizeProduct({ id: 1, variants: [{ id: 1, inventory_management: null, inventory_policy: "continue" }] });
  assert.equal(continueSelling.variants[0].available, true);

  const untracked = normalizeProduct({ id: 1, variants: [{ id: 1, inventory_management: null, inventory_policy: "deny" }] });
  assert.equal(untracked.variants[0].available, null); // unknown stays unknown, never guessed
});

test("normalizeProduct: hasUniqueSkus is true only when every variant has a real, non-duplicate SKU", () => {
  const good = normalizeProduct({ id: 1, variants: [{ id: 1, sku: "A" }, { id: 2, sku: "B" }] });
  assert.equal(good.hasUniqueSkus, true);

  const duplicate = normalizeProduct({ id: 1, variants: [{ id: 1, sku: "A" }, { id: 2, sku: "A" }] });
  assert.equal(duplicate.hasUniqueSkus, false);

  const missing = normalizeProduct({ id: 1, variants: [{ id: 1, sku: "A" }, { id: 2, sku: "" }] });
  assert.equal(missing.hasUniqueSkus, false);

  const noVariants = normalizeProduct({ id: 1, variants: [] });
  assert.equal(noVariants.hasUniqueSkus, false);
});

test("normalizeProduct: price parses to a real number, never a string, and is null when absent", () => {
  const p = normalizeProduct({ id: 1, variants: [{ id: 1, price: "19.99" }, { id: 2, price: null }] });
  assert.equal(p.variants[0].price, 19.99);
  assert.equal(p.variants[1].price, null);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildProductJsonLd,
  normalizeProductUrl,
  validateGeneratedJsonLd,
  productAlreadyComplete,
  buildReusableSnippet,
  REUSABLE_TEMPLATE_PLATFORMS,
} from "./fixGenerator.js";

test("normalizeProductUrl: dedups trailing slash, www, tracking params, fragment", () => {
  const a = normalizeProductUrl("https://www.shop.com/products/serum/?utm_source=ig&variant=123#reviews");
  const b = normalizeProductUrl("https://shop.com/products/serum");
  assert.equal(a, b);
});

test("normalizeProductUrl: falls back to the raw input on a malformed URL rather than throwing", () => {
  assert.doesNotThrow(() => normalizeProductUrl("not a url"));
});

test("validateGeneratedJsonLd: accepts a well-formed product built by buildProductJsonLd", () => {
  const jsonLd = buildProductJsonLd(
    { name: "Vitamin C Serum", price: 599, currency: "INR", availability: "InStock", brand: "TestBrand" },
    "https://testbrand.com/products/serum"
  );
  assert.deepEqual(validateGeneratedJsonLd(jsonLd), { ok: true });
});

test("validateGeneratedJsonLd: rejects a missing name", () => {
  const r = validateGeneratedJsonLd({ "@context": "https://schema.org/", "@type": "Product", url: "https://x.com" });
  assert.equal(r.ok, false);
});

test("validateGeneratedJsonLd: rejects a bad price", () => {
  const r = validateGeneratedJsonLd({
    "@context": "https://schema.org/",
    "@type": "Product",
    name: "X",
    url: "https://x.com",
    offers: { "@type": "Offer", price: "not-a-number" },
  });
  assert.equal(r.ok, false);
});

test("validateGeneratedJsonLd: never accepts an invented rating/review/SKU", () => {
  const r = validateGeneratedJsonLd({
    "@context": "https://schema.org/",
    "@type": "Product",
    name: "X",
    url: "https://x.com",
    aggregateRating: { "@type": "AggregateRating", ratingValue: 5 },
  });
  assert.equal(r.ok, false);
  assert.ok(r.reason.includes("aggregateRating"));
});

test("productAlreadyComplete: true only when JSON-LD exists and nothing is missing", () => {
  assert.equal(productAlreadyComplete(true, { missing: [] }), true);
  assert.equal(productAlreadyComplete(true, { missing: ["price"] }), false);
  assert.equal(productAlreadyComplete(false, { missing: [] }), false);
  assert.equal(productAlreadyComplete(true, null), false);
});

test("buildReusableSnippet: only Shopify and WooCommerce get a reusable template", () => {
  assert.ok(buildReusableSnippet("shopify").includes("product.title"));
  assert.ok(buildReusableSnippet("woocommerce").includes("get_name()"));
  assert.equal(buildReusableSnippet("magento"), null);
  assert.equal(buildReusableSnippet("custom"), null);
  assert.deepEqual([...REUSABLE_TEMPLATE_PLATFORMS].sort(), ["shopify", "woocommerce"]);
});

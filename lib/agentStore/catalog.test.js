import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanCatalog,
  inspectCatalog,
  buildAgentCatalog,
  FRESH_FOR_MS,
  isActiveAccess,
  publicHttpsUrl,
} from "./catalog.js";
import { hasOwnershipMeta } from "./verification.js";
import { paymentReference, isPaymentAdmin } from "./payments.js";
const catalog = () =>
  cleanCatalog({
    name: "Example",
    domain: "https://example.in",
    delivery: "India, 3–5 days. Shipping ₹50.",
    returns: "Unused items within seven days.",
    products: [
      {
        sku: "SKU-1",
        title: "Cotton tee",
        description:
          "A comfortable cotton tee with a relaxed fit for everyday wear.",
        price: "499",
        availability: "InStock",
        url: "https://example.in/products/tee",
        image: "https://example.in/tee.jpg",
      },
    ],
  });
test("publish check rejects unknown inventory, duplicate SKUs and foreign checkout URLs", () => {
  const c = catalog();
  assert.equal(inspectCatalog(c).ready, true);
  c.products.push({
    ...c.products[0],
    availability: "",
    url: "https://attacker.example/pay",
  });
  const r = inspectCatalog(c);
  assert.equal(r.ready, false);
  assert.equal(r.issues.length, 3);
});
test("stale catalog keeps product descriptions but withholds price and stock offers", () => {
  const now = Date.now();
  const c = catalog();
  const fresh = buildAgentCatalog(c, new Date(now).toISOString(), now);
  assert.equal(fresh.itemListElement[0].item.offers.price, "499");
  const old = buildAgentCatalog(
    c,
    new Date(now - FRESH_FOR_MS - 1).toISOString(),
    now,
  );
  assert.equal(old.itemListElement[0].item.offers, undefined);
  assert.equal(
    old.itemListElement[0].item.description,
    c.products[0].description,
  );
});
test("cleaning does not invent unknown availability or accept oversize catalogs", () => {
  const c = catalog();
  c.products[0].availability = "probably";
  assert.equal(cleanCatalog(c).products[0].availability, "");
  assert.throws(() =>
    cleanCatalog({ ...c, products: Array(26).fill(c.products[0]) }),
  );
});
test("unsafe URLs and expired access fail closed", () => {
  for (const u of [
    "javascript:alert(1)",
    "https://localhost",
    "https://127.0.0.1/x",
    "https://user:pass@example.in",
    "https://[::1]/",
    "https://example.in:8080",
  ])
    assert.equal(publicHttpsUrl(u), null);
  assert.equal(isActiveAccess(null), false);
  assert.equal(isActiveAccess("invalid"), false);
  assert.equal(isActiveAccess(new Date(10).toISOString(), 11), false);
});
test("ownership token must be in a real matching meta tag", () => {
  assert.equal(
    hasOwnershipMeta(
      '<meta content="token" name="stockedby-verification">',
      "token",
    ),
    true,
  );
  assert.equal(
    hasOwnershipMeta(
      '<!-- <meta name="stockedby-verification" content="token"> -->',
      "token",
    ),
    false,
  );
  assert.equal(
    hasOwnershipMeta(
      '<script>"<meta name="stockedby-verification" content="token">"</script>',
      "token",
    ),
    false,
  );
  assert.equal(
    hasOwnershipMeta(
      '<meta name="stockedby-verification" content="wrong">',
      "token",
    ),
    false,
  );
});
test("UPI references never establish admin access", () => {
  assert.equal(paymentReference("123456789012"), "123456789012");
  assert.equal(paymentReference("paid!"), null);
  assert.equal(isPaymentAdmin({ email: "merchant@example.in" }, ""), false);
  assert.equal(
    isPaymentAdmin({ email: "merchant@example.in" }, "owner@example.in"),
    false,
  );
  assert.equal(
    isPaymentAdmin({ email: "OWNER@example.in" }, "owner@example.in"),
    true,
  );
});

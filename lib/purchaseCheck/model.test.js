import test from "node:test";
import assert from "node:assert/strict";
import {
  validateCase,
  storeOrigin,
  verdict,
  compareRuns,
  isOperator,
} from "./model.js";
import { evaluatePurchase } from "./assertions.js";
import { demoConfig, demoResult } from "./demo.js";
import { allowedRequest, publicAddress } from "./network.js";
const input = {
  label: "Blue shirt",
  productUrl: "https://shop.example/products/blue-shirt?variant=1234",
  expectedPrice: "1499",
  pin: "560001",
  province: "Karnataka",
  confirmed: true,
};
test("merchant confirms a bounded INR purchase baseline", () => {
  const c = validateCase(input, "https://shop.example");
  assert.equal(c.variantId, "1234");
  assert.equal(c.expectedPricePaise, 149900);
  assert.equal(c.productUrl, "https://shop.example/products/blue-shirt");
  for (const patch of [
    { confirmed: false },
    { pin: "000001" },
    { expectedPrice: "1.009" },
    { variantId: "99999999999999999" },
    { productUrl: "https://another.example/products/shirt" },
    { discount: "SAVE" },
    { expectedPrice: null },
    { expectedCart: -1 },
  ])
    assert.throws(() =>
      validateCase({ ...input, ...patch }, "https://shop.example"),
    );
});
test("store URLs reject credentials, local hosts and custom ports", () => {
  assert.equal(storeOrigin("shop.example"), "https://shop.example");
  for (const value of [
    "http://shop.example",
    "https://u:p@shop.example",
    "localhost",
    "127.0.0.1",
    "https://shop.example:444",
    "https://shop.local",
  ])
    assert.throws(() => storeOrigin(value));
});
test("unknown is never silently counted as a pass", () => {
  assert.equal(verdict([]), "unknown");
  assert.equal(verdict([{ status: "pass" }, { status: "unknown" }]), "unknown");
  assert.equal(verdict([{ status: "issue" }, { status: "unknown" }]), "issue");
  const result = evaluatePurchase(demoConfig, {});
  assert.equal(result.verdict, "unknown");
  assert.equal(
    result.checks.some((c) => c.status === "pass"),
    false,
  );
});
test("cart subtotal differences produce a fix and an unchanged retest can resolve it", () => {
  const before = { config: demoConfig, result: demoResult(false) },
    after = { config: demoConfig, result: demoResult(true) };
  assert.equal(before.result.verdict, "issue");
  assert.equal(after.result.verdict, "pass");
  assert.equal(compareRuns(before, after).filter((c) => c.resolved).length, 1);
  assert.equal(
    compareRuns(before, {
      ...after,
      config: { ...demoConfig, expectedCartPaise: 149900 },
    }),
    null,
  );
});
test("cart endpoint failures and missing currency produce uncertainty", () => {
  const result = evaluatePurchase(demoConfig, {
    product: {
      variants: [{ id: demoConfig.variantId, available: true, price: 149900 }],
    },
    addOk: false,
    cart: { currency: "USD", items: [], total_price: 149900 },
  });
  assert.equal(result.checks.find((c) => c.code === "price").status, "unknown");
  assert.equal(result.checks.find((c) => c.code === "cart").status, "unknown");
  assert.equal(
    result.checks.find((c) => c.code === "subtotal").status,
    "unknown",
  );
});
test("unexpected cart variant cannot pass", () => {
  const result = evaluatePurchase(demoConfig, {
    addOk: true,
    cart: {
      currency: "INR",
      item_count: 1,
      items: [{ variant_id: 999, quantity: 1 }],
      total_price: demoConfig.expectedCartPaise,
    },
  });
  assert.equal(result.checks.find((c) => c.code === "cart").status, "issue");
  assert.equal(
    result.checks.find((c) => c.code === "subtotal").status,
    "unknown",
  );
});
test("worker network blocks private addresses and payment-changing routes", () => {
  for (const address of [
    "127.0.0.1",
    "10.0.0.1",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "::1",
    "::ffff:127.0.0.1",
    "198.18.0.1",
    "203.0.113.10",
  ])
    assert.equal(publicAddress(address), false, address);
  assert.equal(publicAddress("8.8.8.8"), true);
  const origin = "https://shop.example";
  assert.equal(allowedRequest(origin + "/cart/add.js", "POST", origin), true);
  assert.equal(
    allowedRequest(origin + "/en-in/cart/update.js", "POST", origin),
    true,
  );
  assert.equal(
    allowedRequest(origin + "/checkouts/abc/payment", "POST", origin),
    false,
  );
  assert.equal(allowedRequest(origin + "/orders/123", "GET", origin), false);
  assert.equal(
    allowedRequest("http://shop.example/cart.js", "GET", origin),
    false,
  );
  assert.equal(
    allowedRequest("https://evil.example/pixel", "GET", origin),
    false,
  );
  assert.equal(
    allowedRequest("https://cdn.shopify.com/file.js", "POST", origin),
    false,
  );
  assert.equal(
    allowedRequest("https://shop.example:8443/cart.js", "GET", origin),
    false,
  );
});
test("operator identity is explicit and case insensitive", () => {
  assert.equal(
    isOperator({ email: "Owner@Example.com" }, "owner@example.com"),
    true,
  );
  assert.equal(isOperator({ email: "owner@example.com" }, ""), false);
  assert.equal(
    isOperator({ email: "stranger@example.com" }, "owner@example.com"),
    false,
  );
});

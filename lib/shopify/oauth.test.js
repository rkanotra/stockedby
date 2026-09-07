import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { isValidShopDomain, verifyHmac } from "./oauth.js";

test("isValidShopDomain: accepts real myshopify.com domains only", () => {
  assert.equal(isValidShopDomain("my-store.myshopify.com"), true);
  assert.equal(isValidShopDomain("store123.myshopify.com"), true);
});

test("isValidShopDomain: rejects anything that isn't a bare myshopify.com domain", () => {
  assert.equal(isValidShopDomain("my-store.myshopify.com.evil.com"), false);
  assert.equal(isValidShopDomain("myshopify.com"), false);
  assert.equal(isValidShopDomain("http://my-store.myshopify.com"), false);
  assert.equal(isValidShopDomain("my-store.com"), false);
  assert.equal(isValidShopDomain(""), false);
  assert.equal(isValidShopDomain(null), false);
  assert.equal(isValidShopDomain(undefined), false);
});

test("verifyHmac: accepts a signature computed the same way Shopify computes it", () => {
  const secret = "test-secret";
  process.env.SHOPIFY_API_SECRET = secret;
  const params = new URLSearchParams({ shop: "my-store.myshopify.com", code: "abc123", state: "xyz", timestamp: "1700000000" });
  const message = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("&");
  const hmac = createHmac("sha256", secret).update(message).digest("hex");
  params.set("hmac", hmac);
  assert.equal(verifyHmac(params), true);
});

test("verifyHmac: rejects a tampered param (different signature than what's actually being sent)", () => {
  const secret = "test-secret";
  process.env.SHOPIFY_API_SECRET = secret;
  const params = new URLSearchParams({ shop: "my-store.myshopify.com", code: "abc123", state: "xyz" });
  const message = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join("&");
  const hmac = createHmac("sha256", secret).update(message).digest("hex");
  params.set("hmac", hmac);
  params.set("code", "tampered-code"); // changed AFTER computing the real hmac
  assert.equal(verifyHmac(params), false);
});

test("verifyHmac: rejects when SHOPIFY_API_SECRET isn't configured, never a silent pass", () => {
  const original = process.env.SHOPIFY_API_SECRET;
  delete process.env.SHOPIFY_API_SECRET;
  const params = new URLSearchParams({ shop: "my-store.myshopify.com", hmac: "anything" });
  assert.equal(verifyHmac(params), false);
  if (original) process.env.SHOPIFY_API_SECRET = original;
});

test("verifyHmac: missing hmac param -> false, never treated as valid", () => {
  process.env.SHOPIFY_API_SECRET = "test-secret";
  const params = new URLSearchParams({ shop: "my-store.myshopify.com" });
  assert.equal(verifyHmac(params), false);
});

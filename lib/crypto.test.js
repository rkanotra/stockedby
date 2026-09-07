import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { encrypt, decrypt } from "./crypto.js";

const TEST_KEY = randomBytes(32).toString("base64");

test("encrypt/decrypt: round-trips a Shopify-shaped access token exactly", () => {
  process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
  const token = "shpat_" + "a".repeat(32);
  const packed = encrypt(token);
  assert.notEqual(packed, token); // never stores the plaintext value itself
  assert.equal(decrypt(packed), token);
});

test("encrypt: output is never the plaintext, and is different every time (random IV)", () => {
  process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
  const a = encrypt("same-secret");
  const b = encrypt("same-secret");
  assert.notEqual(a, b);
  assert.equal(decrypt(a), "same-secret");
  assert.equal(decrypt(b), "same-secret");
});

test("decrypt: a tampered ciphertext fails closed (GCM auth tag check), never silently returns garbage", () => {
  process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
  const packed = encrypt("shpat_real_token");
  const [iv, tag, data] = packed.split(":");
  const tamperedData = Buffer.from(data, "base64");
  tamperedData[0] ^= 0xff;
  const tampered = [iv, tag, tamperedData.toString("base64")].join(":");
  assert.throws(() => decrypt(tampered));
});

test("encrypt: throws (fails closed) rather than silently storing plaintext when the key is missing", () => {
  const original = process.env.TOKEN_ENCRYPTION_KEY;
  delete process.env.TOKEN_ENCRYPTION_KEY;
  assert.throws(() => encrypt("shpat_real_token"));
  if (original) process.env.TOKEN_ENCRYPTION_KEY = original;
});

test("encrypt: throws when the key isn't a valid 32-byte base64 value", () => {
  process.env.TOKEN_ENCRYPTION_KEY = "not-a-valid-32-byte-key";
  assert.throws(() => encrypt("shpat_real_token"));
  process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY;
});

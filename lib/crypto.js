import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Symmetric encryption for at-rest secrets that must be stored in Supabase
// but can never be plaintext there — currently just a Shopify store's
// access token (lib/shopify/stores.js). AES-256-GCM via node:crypto, no
// new dependency. TOKEN_ENCRYPTION_KEY is a 32-byte key, base64-encoded,
// in Vercel env vars only (hard rule 1) — generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
//
// Unlike GEMINI_API_KEY/SUPABASE_URL/etc, this is NOT an optional
// integration key that degrades gracefully when unset — encrypt()/
// decrypt() throw instead, so a missing key fails the Shopify OAuth
// callback loudly rather than ever storing (or trying to read back) a
// plaintext access token.
function keyBytes() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not configured.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode (base64) to exactly 32 bytes.");
  }
  return key;
}

// Output: "<iv>:<authTag>:<ciphertext>", each base64 — self-contained, so
// decrypt() never needs anything but this one string plus the env key.
export function encrypt(plaintext) {
  const key = keyBytes();
  const iv = randomBytes(12); // 96-bit IV, GCM's recommended size
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decrypt(packed) {
  const key = keyBytes();
  const [ivB64, tagB64, dataB64] = String(packed || "").split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted value.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return plaintext.toString("utf8");
}

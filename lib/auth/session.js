import { randomBytes, createHash } from "node:crypto";
import { supabase } from "../supabaseClient.js";

// Merchant auth (Phase 2): email-only, magic-link login — no password, no
// new dependency (NextAuth/etc). A raw token/session value is only ever
// held by the browser (as an httpOnly cookie) or emailed once; the
// database only ever stores its SHA-256 hash, same principle as this
// app's disposable-domain/dedup work elsewhere — a leaked DB row can never
// be replayed as a live session or login link.

export const SESSION_COOKIE_NAME = "sb_merchant_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes — short-lived on purpose

function randomToken() {
  return randomBytes(32).toString("hex");
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

// Step 1 of login: create a single-use magic-link token for this email.
// Returns the RAW token (only ever returned here, for the caller to email
// — see app/api/auth/request-link/route.js) — never logged, never stored
// as-is. No-ops (returns null) if Supabase isn't configured, same
// degrade-gracefully posture as the rest of this app's optional infra;
// unlike lib/crypto.js's token encryption, login simply isn't available
// without persistence, which is an honest failure mode, not a security one.
export async function createMagicLinkToken(email) {
  const db = supabase();
  if (!db) return null;
  const token = randomToken();
  const { error } = await db.from("merchant_auth_tokens").insert({
    email: email.toLowerCase().trim(),
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + MAGIC_LINK_TTL_MS).toISOString(),
  });
  if (error) {
    console.error("[auth] createMagicLinkToken failed", error.message);
    return null;
  }
  return token;
}

// Step 2: redeem a magic-link token. Single-use (used_at is set the
// moment it's redeemed, and never redeemed twice), and expires after 15
// minutes. Creates the merchant row on first-ever login (no separate
// "sign up" step — same "email is the whole account" model as
// merchant_auth_tokens itself). Returns { merchantId, email } or null.
export async function redeemMagicLinkToken(token) {
  const db = supabase();
  if (!db || !token) return null;
  const tokenHash = hashToken(token);

  const { data: row, error } = await db
    .from("merchant_auth_tokens")
    .select("id, email, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .single();
  if (error || !row) return null;
  if (row.used_at) return null; // already redeemed — never twice
  if (new Date(row.expires_at) < new Date()) return null;

  // Mark used BEFORE creating the session/merchant, so a race (two
  // requests redeeming the same link near-simultaneously) can't both
  // succeed — the second update affects 0 rows (used_at already set) and
  // is treated as a failed redemption below via the returned data check.
  const { data: claimed, error: claimError } = await db
    .from("merchant_auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("used_at", null)
    .select("id")
    .single();
  if (claimError || !claimed) return null;

  const email = row.email;
  let { data: merchant } = await db.from("merchants").select("id").eq("email", email).single();
  if (!merchant) {
    const { data: created, error: createError } = await db
      .from("merchants")
      .insert({ email })
      .select("id")
      .single();
    if (createError || !created) {
      console.error("[auth] merchant creation failed", createError?.message);
      return null;
    }
    merchant = created;
  }

  await db.from("merchants").update({ last_login_at: new Date().toISOString() }).eq("id", merchant.id);

  return { merchantId: merchant.id, email };
}

// Creates a new session row and returns the RAW session token (to be set
// as the httpOnly cookie by the caller — a Route Handler, since Next only
// allows setting cookies there or in a Server Function, never a plain
// Server Component render).
export async function createSession(merchantId) {
  const db = supabase();
  if (!db) return null;
  const token = randomToken();
  const { error } = await db.from("merchant_sessions").insert({
    merchant_id: merchantId,
    token_hash: hashToken(token),
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  });
  if (error) {
    console.error("[auth] createSession failed", error.message);
    return null;
  }
  return token;
}

// Resolves a raw session-cookie value to { merchantId, email }, or null if
// missing/expired/unknown. Never throws — every caller (lib/auth/
// requireMerchant.js) treats null as "not logged in."
export async function getMerchantForSessionToken(token) {
  const db = supabase();
  if (!db || !token) return null;
  const { data, error } = await db
    .from("merchant_sessions")
    .select("expires_at, merchants(id, email)")
    .eq("token_hash", hashToken(token))
    .single();
  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  if (!data.merchants) return null;
  return { merchantId: data.merchants.id, email: data.merchants.email };
}

export async function destroySession(token) {
  const db = supabase();
  if (!db || !token) return;
  try {
    await db.from("merchant_sessions").delete().eq("token_hash", hashToken(token));
  } catch (e) {
    console.error("[auth] destroySession failed", e?.message || e);
  }
}

export const SESSION_MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

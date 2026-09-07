import { randomBytes } from "node:crypto";
import { supabase } from "../supabaseClient.js";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes — long enough for a real install, short enough to bound replay risk

// CSRF protection for the OAuth authorization-code flow (app/api/shopify/
// install -> Shopify -> app/api/shopify/callback): a random, single-use
// state value tied to the merchant who initiated install and the shop
// they named, so the callback can refuse a state it didn't just issue —
// standard OAuth state-param defense, on top of (not instead of)
// verifyHmac()'s signature check.
export async function createOAuthState({ shop, merchantId }) {
  const db = supabase();
  if (!db) return null;
  const state = randomBytes(24).toString("hex");
  const { error } = await db.from("shopify_oauth_states").insert({
    state,
    shop,
    merchant_id: merchantId,
    expires_at: new Date(Date.now() + STATE_TTL_MS).toISOString(),
  });
  if (error) {
    console.error("[shopify] createOAuthState failed", error.message);
    return null;
  }
  return state;
}

// Single-use: deletes the row on redemption regardless of outcome, so a
// replayed callback (same state param hit twice) always fails the second
// time.
export async function redeemOAuthState({ state, shop }) {
  const db = supabase();
  if (!db || !state) return null;
  const { data, error } = await db.from("shopify_oauth_states").select("*").eq("state", state).maybeSingle();
  if (error || !data) return null;
  await db.from("shopify_oauth_states").delete().eq("state", state);
  if (new Date(data.expires_at) < new Date()) return null;
  if (data.shop !== shop) return null;
  return { merchantId: data.merchant_id };
}

import { NextResponse } from "next/server";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { isValidShopDomain, verifyHmac, exchangeCodeForToken } from "@/lib/shopify/oauth";
import { redeemOAuthState } from "@/lib/shopify/state";
import { upsertStore } from "@/lib/shopify/stores";

export const runtime = "nodejs";

// Step 2: Shopify redirects here with ?shop&code&state&hmac&timestamp
// after the merchant approves the install. Security, in order: (1) HMAC
// signature verification (lib/shopify/oauth.js's verifyHmac — proves this
// request really came from Shopify, not a forged redirect), (2) the
// one-time, merchant-bound `state` value (lib/shopify/state.js — CSRF
// protection, and the only thing that tells us WHICH merchant this
// install belongs to), THEN the authorization code is exchanged for a
// real access token, which is encrypted before it's ever persisted
// (lib/crypto.js, via lib/shopify/stores.js's upsertStore). Every failure
// mode redirects back to the dashboard with a specific, non-sensitive
// error code — never a raw stack trace or Shopify's own response body.
export async function GET(request) {
  const url = new URL(request.url);
  if (!isShopifyConfigured()) {
    return NextResponse.redirect(new URL("/dashboard?error=unavailable", url.origin));
  }

  const shop = (url.searchParams.get("shop") || "").toLowerCase().trim();
  const code = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";

  if (!isValidShopDomain(shop) || !code || !state) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_callback", url.origin));
  }
  if (!verifyHmac(url.searchParams)) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_signature", url.origin));
  }

  const redeemed = await redeemOAuthState({ state, shop });
  if (!redeemed) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_state", url.origin));
  }

  let tokenResult;
  try {
    tokenResult = await exchangeCodeForToken({ shop, code });
  } catch (e) {
    console.error("[shopify] token exchange failed", e?.message || e);
    return NextResponse.redirect(new URL("/dashboard?error=token_exchange_failed", url.origin));
  }

  let store;
  try {
    store = await upsertStore({
      merchantId: redeemed.merchantId,
      shop,
      accessToken: tokenResult.accessToken,
      scope: tokenResult.scope,
    });
  } catch (e) {
    // Only ever thrown by lib/crypto.js's encrypt() when TOKEN_ENCRYPTION_KEY
    // is missing/malformed — fail closed rather than ever storing a
    // plaintext access token.
    console.error("[shopify] store save failed", e?.message || e);
    return NextResponse.redirect(new URL("/dashboard?error=save_failed", url.origin));
  }
  if (!store) {
    return NextResponse.redirect(new URL("/dashboard?error=save_failed", url.origin));
  }

  return NextResponse.redirect(new URL("/dashboard?connected=1", url.origin));
}

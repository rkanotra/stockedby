import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, getMerchantForSessionToken } from "@/lib/auth/session";
import { isShopifyConfigured } from "@/lib/shopify/config";
import { isValidShopDomain, buildAuthorizeUrl } from "@/lib/shopify/oauth";
import { createOAuthState } from "@/lib/shopify/state";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Step 1 of the Shopify OAuth authorization-code flow: GET
// /api/shopify/install?shop=your-store.myshopify.com (components/
// dashboard/ConnectStoreForm.js navigates here directly — Shopify's own
// authorize page has to load in the top-level browsing context, so this
// is a real redirect, never a fetch). Requires a signed-in merchant —
// SHOPIFY_API_KEY/SECRET absent means the whole feature is off (501), same
// posture as every other optional integration in this app.
export async function GET(request) {
  if (!isShopifyConfigured()) {
    return NextResponse.json({ error: "Shopify connection is not configured yet." }, { status: 501 });
  }

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const merchant = token ? await getMerchantForSessionToken(token) : null;
  if (!merchant) return NextResponse.redirect(new URL("/login", request.url));

  // Own namespace/limit (hard rule 9's pattern) — a signed-in session
  // shouldn't be able to hammer OAuth-state creation or Shopify's own
  // authorize endpoint indefinitely.
  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip, { namespace: "shopify-install", limit: 20 });
  if (!rateLimit.allowed) {
    return NextResponse.redirect(new URL("/dashboard?error=rate_limited", request.url));
  }

  const { searchParams, origin } = new URL(request.url);
  const shop = (searchParams.get("shop") || "").toLowerCase().trim();
  if (!isValidShopDomain(shop)) {
    return NextResponse.redirect(new URL("/dashboard?error=invalid_shop", origin));
  }

  const state = await createOAuthState({ shop, merchantId: merchant.merchantId });
  if (!state) {
    return NextResponse.redirect(new URL("/dashboard?error=unavailable", origin));
  }

  return NextResponse.redirect(buildAuthorizeUrl({ shop, state }));
}

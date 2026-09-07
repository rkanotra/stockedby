import { createHmac, timingSafeEqual } from "node:crypto";
import { SHOPIFY_SCOPES } from "./config.js";
import { SITE_URL } from "../site.js";

const SHOP_DOMAIN_RE = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

// A Shopify shop domain is always exactly "<store>.myshopify.com" — unlike
// the free /audit tool's assertPublicHostname() (lib/audit/ssrfGuard.js),
// which has to validate an arbitrary merchant-entered domain, this is a
// closed, fixed pattern, so a strict regex is the right check here rather
// than a general SSRF guard (Shopify's own servers are the only thing
// this hostname ever resolves to).
export function isValidShopDomain(shop) {
  return typeof shop === "string" && SHOP_DOMAIN_RE.test(shop.toLowerCase().trim());
}

export function buildAuthorizeUrl({ shop, state }) {
  const redirectUri = `${SITE_URL}/api/shopify/callback`;
  const params = new URLSearchParams({
    client_id: process.env.SHOPIFY_API_KEY,
    scope: SHOPIFY_SCOPES,
    redirect_uri: redirectUri,
    state,
  });
  return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
}

// Shopify's documented OAuth callback verification: every query param
// except `hmac` (and the deprecated `signature`), sorted by key, joined as
// "key=value&key2=value2", HMAC-SHA256 with the app's client secret,
// compared against the `hmac` param. Timing-safe compare — a plain
// string `===` here would make the callback's authenticity check
// vulnerable to a timing attack, the same reasoning
// app/api/webhooks/resend/route.js's Svix signature check already
// follows for a different webhook.
export function verifyHmac(searchParams) {
  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) return false;
  const provided = searchParams.get("hmac");
  if (!provided) return false;

  const pairs = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "hmac" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const message = pairs.join("&");
  const digest = createHmac("sha256", secret).update(message).digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Authorization-code grant, step 2: trade the one-time `code` for a real
// access token. Never retried/cached — a fresh call every OAuth install,
// same "no silent retry that could double-spend a one-time code" posture
// as lib/harvestClients.js's maxRetries: 0.
export async function exchangeCodeForToken({ shop, code }) {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  if (!res.ok) throw new Error(`Shopify token exchange failed: ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error("Shopify token exchange returned no access_token.");
  return { accessToken: data.access_token, scope: data.scope };
}

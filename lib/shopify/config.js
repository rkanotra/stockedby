// Phase 2 Shopify connection config. SHOPIFY_API_KEY/SHOPIFY_API_SECRET
// are server-only (hard rule 1), set in Vercel env vars — like every other
// integration in this app, absent keys mean the feature is off
// (isShopifyConfigured() below), not a build failure. read_products is the
// only scope Phase 2 needs (catalog ingestion for readiness scoring) — no
// order/customer/checkout access requested at all, matching this phase's
// explicit "recommendations only, no automated fixes" constraint.
export const SHOPIFY_API_VERSION = "2024-10";
export const SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES || "read_products";

export function isShopifyConfigured() {
  return Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET);
}

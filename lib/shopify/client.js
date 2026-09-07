import { SHOPIFY_API_VERSION } from "./config.js";

function parseLinkHeader(header) {
  if (!header) return {};
  const links = {};
  header.split(",").forEach((part) => {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (!match) return;
    try {
      links[match[2]] = new URL(match[1]).searchParams.get("page_info");
    } catch {
      // malformed Link header entry — ignored, never guessed at
    }
  });
  return links;
}

// One page of a store's product catalog. Shopify's Admin API only
// supports CURSOR pagination for /products.json (the old numeric `page`
// param was removed years ago) — `pageInfo` is the opaque cursor from a
// previous call's `nextPageInfo`, undefined for the first page. A request
// past the first page must carry ONLY page_info + limit (any other filter
// param makes Shopify 400), which is fine here since this app never
// filters the catalog fetch by anything else.
export async function fetchProductsPage({ shop, accessToken, limit = 100, pageInfo }) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (pageInfo) params.set("page_info", pageInfo);
  const url = `https://${shop}/admin/api/${SHOPIFY_API_VERSION}/products.json?${params.toString()}`;

  const res = await fetch(url, { headers: { "X-Shopify-Access-Token": accessToken } });
  if (res.status === 401) {
    throw Object.assign(new Error("Shopify access token is invalid or revoked."), { code: "unauthorized" });
  }
  if (!res.ok) throw new Error(`Shopify products fetch failed: ${res.status}`);

  const data = await res.json();
  const links = parseLinkHeader(res.headers.get("link"));
  return { products: Array.isArray(data.products) ? data.products : [], nextPageInfo: links.next || null };
}

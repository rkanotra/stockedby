// Discovering one real product URL without a headless browser — best-effort
// only, and callers must treat "found nothing" as an honest unknown, never
// a fabricated failure of the page it would have pointed to.
const PRODUCT_PATH_RE = /\/(?:products?|item|shop)\/[a-z0-9][\w-]*\/?(?:[?#]|$)/i;

export function extractSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s][^<]*?)\s*<\/loc>/gi)].map((m) => m[1]);
}

// Given a fetched sitemap.xml body, either returns a direct product URL, a
// candidate sub-sitemap URL to fetch next (sitemap index case), or null.
export function scanSitemap(xml) {
  const locs = extractSitemapLocs(xml);
  const direct = locs.find((u) => {
    try {
      return PRODUCT_PATH_RE.test(new URL(u).pathname);
    } catch {
      return false;
    }
  });
  if (direct) return { productUrl: direct };

  const subSitemap = locs.find((u) => /product/i.test(u) && /\.xml(\?|$)/i.test(u));
  return subSitemap ? { subSitemap } : null;
}

// Fallback: scan the homepage's own links for anything product-shaped.
export function findProductUrlInHtml(html, baseUrl) {
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    try {
      const abs = new URL(href, baseUrl);
      if (PRODUCT_PATH_RE.test(abs.pathname)) return abs.toString();
    } catch {
      // malformed href — skip
    }
  }
  return null;
}

// ---- Multi-URL discovery for app/api/fix — needs several real product
// pages to extract from, not just one to spot-check. Same PRODUCT_PATH_RE,
// same sub-sitemap-follow shape as scanSitemap() above; these are
// deliberately separate functions rather than a `limit` param bolted onto
// the existing ones, so /api/audit's single-URL behavior can't regress.

// Every product-shaped <loc> in a sitemap (not just the first), capped at
// `limit`. Falls back to naming one product-flavored sub-sitemap to follow
// (sitemap-index case) when the top-level file has no direct product URLs.
export function scanSitemapMulti(xml, limit) {
  const locs = extractSitemapLocs(xml);
  const direct = locs.filter((u) => {
    try {
      return PRODUCT_PATH_RE.test(new URL(u).pathname);
    } catch {
      return false;
    }
  });
  if (direct.length > 0) return { productUrls: direct.slice(0, limit) };

  const subSitemap = locs.find((u) => /product/i.test(u) && /\.xml(\?|$)/i.test(u));
  return { productUrls: [], subSitemap: subSitemap || null };
}

// Common listing-page paths to probe directly when the sitemap tier didn't
// yield enough URLs — these pages then get scanned (findProductUrlsInHtml)
// for the actual product links they list, not treated as products
// themselves.
const COMMON_LISTING_PATHS = ["/products/", "/shop/", "/collections/"];
export function commonListingUrls(baseUrl) {
  return COMMON_LISTING_PATHS.map((p) => new URL(p, baseUrl).toString());
}

// Multi-URL version of findProductUrlInHtml — every distinct product-shaped
// link in the given HTML, capped at `limit`.
export function findProductUrlsInHtml(html, baseUrl, limit) {
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const found = [];
  const seen = new Set();
  for (const href of hrefs) {
    if (found.length >= limit) break;
    try {
      const abs = new URL(href, baseUrl).toString();
      if (PRODUCT_PATH_RE.test(new URL(abs).pathname) && !seen.has(abs)) {
        seen.add(abs);
        found.push(abs);
      }
    } catch {
      // malformed href — skip
    }
  }
  return found;
}

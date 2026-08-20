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

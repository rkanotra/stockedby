import { NextResponse } from "next/server";
import { normalizeDomain } from "@/lib/scoring";
import { assertPublicHostname, BlockedHostError } from "@/lib/audit/ssrfGuard";
import { fetchTextSafe } from "@/lib/audit/fetchWithTimeout";
import { evaluateRobotsTxt } from "@/lib/audit/robots";
import { findProductSchema, validateProductFields } from "@/lib/audit/jsonld";
import { detectPlatform, detectStripe } from "@/lib/audit/platform";
import { scanSitemap, findProductUrlInHtml } from "@/lib/audit/productDiscovery";
import { buildAuditResult } from "@/lib/audit/score";
import { gatherAuditSignals, wellKnownResult } from "@/lib/audit/gatherSignals";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

// Several sequential-ish fetches to an arbitrary domain (robots.txt,
// llms.txt, two .well-known manifests, homepage, sitemap, one product
// page) — comfortably under a minute even with per-request timeouts, but
// give it the same Hobby-plan headroom as /api/test.
export const maxDuration = 60;
export const runtime = "nodejs";

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const rawDomain = typeof body?.domain === "string" ? body.domain.trim() : "";
  if (!rawDomain) return badRequest('"domain" is required.');

  const hostname = normalizeDomain(rawDomain);
  if (!hostname || !hostname.includes(".")) {
    return badRequest("That doesn't look like a valid domain.");
  }

  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip, { namespace: "audit", limit: 10 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Daily audit limit reached for your network. Try again tomorrow." },
      { status: 429 }
    );
  }

  try {
    await assertPublicHostname(hostname);
  } catch (e) {
    if (e instanceof BlockedHostError) {
      return badRequest(e.message);
    }
    return badRequest("Couldn't resolve that domain.");
  }

  // First wave: everything independent of each other, all in parallel —
  // shared with app/api/fix/route.js's own "before" snapshot, see
  // lib/audit/gatherSignals.js.
  const { base, headers, robotsTxt, llmsTxt, ucpRaw, acpRaw, homepage, sitemapXml } =
    await gatherAuditSignals(hostname);

  if (!homepage.ok || !homepage.text) {
    return NextResponse.json(
      { error: `Couldn't reach ${hostname}. It may be down, blocking our requests, or not resolving.` },
      { status: 502 }
    );
  }

  // Product URL discovery: sitemap first (following one level into a
  // product-named sub-sitemap if it's an index), falling back to scanning
  // the homepage's own links. Best-effort — "couldn't find one" is an
  // honest outcome, not an error.
  let productUrl = null;
  if (sitemapXml.ok && sitemapXml.text) {
    const scan = scanSitemap(sitemapXml.text);
    if (scan?.productUrl) {
      productUrl = scan.productUrl;
    } else if (scan?.subSitemap) {
      try {
        const subHost = new URL(scan.subSitemap).hostname;
        if (subHost === hostname) {
          const sub = await fetchTextSafe(scan.subSitemap, { headers });
          if (sub.ok && sub.text) {
            productUrl = scanSitemap(sub.text)?.productUrl || null;
          }
        }
      } catch {
        // malformed sub-sitemap URL — skip
      }
    }
  }
  if (!productUrl) {
    productUrl = findProductUrlInHtml(homepage.text, base);
  }

  const productPage = productUrl ? await fetchTextSafe(productUrl, { headers }) : { ok: false, text: null };

  const platform = detectPlatform(homepage.text);
  const stripeDetected = detectStripe(homepage.text);
  const robotsResult = evaluateRobotsTxt(robotsTxt.ok ? robotsTxt.text : null);
  const llmsTxtExists = llmsTxt.ok && Boolean(llmsTxt.text);
  const homepageSchema = findProductSchema(homepage.text);

  let productCheck = { productUrl, fetched: false, hasAnyJsonLd: false, product: null, fieldCheck: null };
  if (productUrl && productPage.ok && productPage.text) {
    const schema = findProductSchema(productPage.text);
    productCheck = {
      productUrl,
      fetched: true,
      hasAnyJsonLd: schema.hasAnyJsonLd,
      product: schema.product,
      fieldCheck: validateProductFields(schema.product),
    };
  }

  const result = buildAuditResult({
    domain: hostname,
    platform,
    robotsResult,
    llmsTxtExists,
    ucpResult: wellKnownResult(ucpRaw),
    acpResult: wellKnownResult(acpRaw),
    homepageHasJsonLd: homepageSchema.hasAnyJsonLd,
    productCheck,
    stripeDetected,
  });

  return NextResponse.json({ ok: true, ...result, rateLimit });
}

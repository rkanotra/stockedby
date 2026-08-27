import { NextResponse } from "next/server";
import { normalizeDomain } from "@/lib/scoring";
import { assertPublicHostname, BlockedHostError } from "@/lib/audit/ssrfGuard";
import { fetchTextSafe } from "@/lib/audit/fetchWithTimeout";
import { evaluateRobotsTxt } from "@/lib/audit/robots";
import { findProductSchema, validateProductFields } from "@/lib/audit/jsonld";
import { detectPlatform, detectStripe } from "@/lib/audit/platform";
import {
  scanSitemapMulti,
  commonListingUrls,
  findProductUrlsInHtml,
} from "@/lib/audit/productDiscovery";
import { buildAuditResult } from "@/lib/audit/score";
import { gatherAuditSignals, wellKnownResult } from "@/lib/audit/gatherSignals";
import {
  buildProductJsonLd,
  extractMetaDescription,
  extractTitle,
  buildLlmsTxt,
  normalizeProductUrl,
  validateGeneratedJsonLd,
  productAlreadyComplete,
} from "@/lib/audit/fixGenerator";
import { extractProductData } from "@/lib/claudeClient";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";
import { supabase } from "@/lib/supabaseClient";

// Signal-gathering (~8s) + a page-fetch wave (~8s) + a Claude-extraction
// wave, up to 8 calls in parallel at haiku's own 20s timeout — sequential
// worst case is comfortably under a minute, same headroom precedent as
// /api/audit's maxDuration.
export const maxDuration = 60;
export const runtime = "nodejs";

const MAX_PRODUCTS = 8; // hard rule 7's cost discipline, extended: haiku only, capped volume

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Never lets one page's extraction throw and take the whole
// Promise.all down — a fetch or Claude-call failure becomes a normal
// "couldn't parse" result, not a 500. Two founder-facing outcomes beyond
// done/error, both gating whether we generate anything at all:
// "already-good" (the page's own EXISTING JSON-LD already covers every
// required field — lib/audit/jsonld.js's findProductSchema/
// validateProductFields, the same functions the audit itself uses — so
// we never paper a duplicate, possibly-conflicting Product block on top
// of one that's already correct) and "invalid" (the code we generated
// failed lib/audit/fixGenerator.js's own validation — never shown as if
// it were ready to paste).
async function extractOne(url, headers) {
  try {
    const page = await fetchTextSafe(url, { headers });
    if (!page.ok || !page.text) {
      return { url, status: "error", error: "Couldn't fetch this page." };
    }

    const existing = findProductSchema(page.text);
    const existingFieldCheck = validateProductFields(existing.product);
    if (productAlreadyComplete(existing.hasAnyJsonLd, existingFieldCheck)) {
      return { url, status: "already-good", product: existing.product };
    }

    const product = await extractProductData(page.text, url);
    if (!product) {
      return { url, status: "error", error: "Fetched the page, but it didn't look like a real product page." };
    }
    const jsonLd = buildProductJsonLd(product, url);
    const validation = validateGeneratedJsonLd(jsonLd);
    if (!validation.ok) {
      return { url, status: "invalid", product, error: "We couldn't safely generate this fix yet." };
    }
    return { url, status: "done", product, jsonLd };
  } catch (e) {
    return { url, status: "error", error: e?.message || "Something went wrong reading this page." };
  }
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
  // One run per domain per day per IP — composite key on the existing
  // in-memory limiter (lib/rateLimit.js), same pattern app/api/test uses
  // for its own namespaced caps, no changes to rateLimit.js needed.
  const rateLimit = checkAndConsume(`${ip}:${hostname}`, { namespace: "fix", limit: 1 });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "This site's fix was already generated today. Try again tomorrow, or check another domain." },
      { status: 429 }
    );
  }

  try {
    await assertPublicHostname(hostname);
  } catch (e) {
    if (e instanceof BlockedHostError) return badRequest(e.message);
    return badRequest("Couldn't resolve that domain.");
  }

  const { base, headers, robotsTxt, llmsTxt, ucpRaw, acpRaw, homepage, sitemapXml } =
    await gatherAuditSignals(hostname);

  if (!homepage.ok || !homepage.text) {
    return NextResponse.json(
      { error: `Couldn't reach ${hostname}. It may be down, blocking our requests, or not resolving.` },
      { status: 502 }
    );
  }

  const platform = detectPlatform(homepage.text);

  // ---- Discover up to MAX_PRODUCTS product URLs ----
  // Tier 1: sitemap.xml (every product-shaped <loc>, following one level
  // into a product-named sub-sitemap if the top-level file is an index).
  // Tier 2: common listing paths (/products/, /shop/, /collections/),
  // fetched and scanned for the product links they list. Tier 3: the
  // homepage's own links. Each tier only runs if the previous one didn't
  // fill MAX_PRODUCTS — cheapest/most-likely-correct source first.
  // Every URL is normalized (trailing slash/www/tracking params/fragment
  // stripped — lib/audit/fixGenerator.js's normalizeProductUrl) before
  // it's added or checked against `seen`, so the same page reached two
  // different ways (a sitemap entry and a homepage link, say) never
  // becomes two separate "fixes" for the same product.
  let productUrls = [];
  if (sitemapXml.ok && sitemapXml.text) {
    const scan = scanSitemapMulti(sitemapXml.text, MAX_PRODUCTS);
    productUrls = scan.productUrls.map(normalizeProductUrl);
    if (productUrls.length === 0 && scan.subSitemap) {
      try {
        const subHost = new URL(scan.subSitemap).hostname;
        if (subHost === hostname) {
          const sub = await fetchTextSafe(scan.subSitemap, { headers });
          if (sub.ok && sub.text) {
            productUrls = scanSitemapMulti(sub.text, MAX_PRODUCTS).productUrls.map(normalizeProductUrl);
          }
        }
      } catch {
        // malformed sub-sitemap URL — skip, fall through to the next tier
      }
    }
  }

  if (productUrls.length < MAX_PRODUCTS) {
    const remaining = MAX_PRODUCTS - productUrls.length;
    const listingPages = await Promise.all(
      commonListingUrls(base).map((u) => fetchTextSafe(u, { headers }))
    );
    const seen = new Set(productUrls);
    for (const page of listingPages) {
      if (!page.ok || !page.text) continue;
      for (const raw of findProductUrlsInHtml(page.text, base, remaining)) {
        const u = normalizeProductUrl(raw);
        if (!seen.has(u)) {
          seen.add(u);
          productUrls.push(u);
        }
      }
      if (productUrls.length >= MAX_PRODUCTS) break;
    }
  }

  if (productUrls.length < MAX_PRODUCTS) {
    const remaining = MAX_PRODUCTS - productUrls.length;
    const seen = new Set(productUrls);
    for (const raw of findProductUrlsInHtml(homepage.text, base, remaining)) {
      const u = normalizeProductUrl(raw);
      if (!seen.has(u)) {
        seen.add(u);
        productUrls.push(u);
      }
    }
  }
  productUrls = productUrls.slice(0, MAX_PRODUCTS);

  if (productUrls.length === 0) {
    return NextResponse.json(
      {
        error:
          "Couldn't find any product pages on this site (checked the sitemap, common shop paths, and the homepage's own links). Try a different domain, or make sure the site has a public sitemap.xml.",
      },
      { status: 502 }
    );
  }

  // ---- Extract each page in parallel ----
  const products = await Promise.all(productUrls.map((u) => extractOne(u, headers)));

  // ---- llms.txt, from the homepage's own already-published text ----
  const title = extractTitle(homepage.text);
  const description = extractMetaDescription(homepage.text);
  const llmsTxtContent = buildLlmsTxt({
    domain: hostname,
    title,
    description,
    products: products
      .filter((p) => p.status === "done" || p.status === "already-good")
      .map((p) => ({
        name: p.product.name,
        url: p.url,
        description: p.product.description,
      })),
  });

  // ---- "Before" snapshot — same computation /api/audit uses, from
  // signals already gathered above plus the first product page this run
  // itself fetched, so "Verify it worked" has a real baseline to diff a
  // fresh /api/audit call against without a second round-trip up front. ----
  const firstDone = products.find((p) => p.status === "done" || p.status === "already-good");
  const firstProductUrl = firstDone?.url || productUrls[0] || null;
  let productCheck = { productUrl: firstProductUrl, fetched: false, hasAnyJsonLd: false, product: null, fieldCheck: null };
  if (firstProductUrl) {
    const page = await fetchTextSafe(firstProductUrl, { headers });
    if (page.ok && page.text) {
      const schema = findProductSchema(page.text);
      productCheck = {
        productUrl: firstProductUrl,
        fetched: true,
        hasAnyJsonLd: schema.hasAnyJsonLd,
        product: schema.product,
        fieldCheck: validateProductFields(schema.product),
      };
    }
  }
  const auditBefore = buildAuditResult({
    domain: hostname,
    platform,
    robotsResult: evaluateRobotsTxt(robotsTxt.ok ? robotsTxt.text : null),
    llmsTxtExists: llmsTxt.ok && Boolean(llmsTxt.text),
    ucpResult: wellKnownResult(ucpRaw),
    acpResult: wellKnownResult(acpRaw),
    homepageHasJsonLd: findProductSchema(homepage.text).hasAnyJsonLd,
    productCheck,
    stripeDetected: detectStripe(homepage.text),
  });

  // Best-effort persistence — a save failure never blocks the response,
  // same "never fail the free tool over an optional infra dependency"
  // pattern as lib/reports.js / lib/snapshotCache.js.
  const db = supabase();
  if (db) {
    try {
      const { error } = await db.from("fix_runs").insert({
        domain: hostname,
        platform,
        products_json: products,
        llms_txt: llmsTxtContent,
        audit_before_json: auditBefore,
      });
      if (error) console.error("[fix] fix_runs insert failed", error.message);
    } catch (e) {
      console.error("[fix] fix_runs insert failed", e?.message || e);
    }
  }

  return NextResponse.json({
    ok: true,
    domain: hostname,
    platform,
    products,
    llmsTxt: llmsTxtContent,
    auditBefore,
    rateLimit,
  });
}

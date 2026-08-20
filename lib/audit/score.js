import { AI_BOTS } from "./robots";
import { platformLabel } from "./platform";

// ---------- fix-line copy (platform-aware) ----------

function robotsFixLine(bot, platform) {
  if (platform === "shopify") {
    return `Shopify blocks some AI crawlers by default. In Shopify Admin, check Online Store → Preferences for an AI/search-crawler toggle, or edit your theme's robots.txt.liquid to remove the Disallow rule for ${bot}.`;
  }
  return `Edit your robots.txt to remove the Disallow rule blocking ${bot} (or add an explicit "Allow: /" for it).`;
}

function llmsTxtFixLine() {
  return "Add a /llms.txt file at your site root — a short plain-text summary of your business written for AI agents. Format: llmstxt.org.";
}

function wellKnownFixLine(protocolName) {
  return `Publish a /.well-known/${protocolName.toLowerCase()} manifest describing your store to agentic checkout systems. This is emerging infrastructure — most platforms don't generate it automatically yet, so it typically needs to be added by hand or via a developer.`;
}

function homepageSchemaFixLine(platform) {
  if (platform === "shopify") {
    return "Most Shopify themes include basic structured data by default — if none was found, check your theme for a JSON-LD snippet in theme.liquid, or install a structured-data app from the Shopify App Store.";
  }
  return "Add basic schema.org structured data (Organization/WebSite JSON-LD) to your homepage template.";
}

function productSchemaFixLine(platform) {
  switch (platform) {
    case "shopify":
      return "Shopify includes Product schema in most themes by default — if fields are missing, check your product template for a JSON-LD snippet, or install a structured-data app to fill the gaps.";
    case "woocommerce":
      return "Install a schema plugin (e.g. Yoast SEO or Schema Pro) to auto-generate Product/Offer JSON-LD, or add it directly to your product template.";
    case "magento":
      return "Magento 2 ships Rich Snippets for products — check Content → Design → Configuration to confirm schema markup is enabled for your theme.";
    case "salla":
    case "zid":
      return `Check your ${platformLabel(platform)} theme's product template for JSON-LD — this usually needs adding via the theme editor or a custom snippet.`;
    default:
      return "Add JSON-LD Product/Offer markup to your product pages (schema.org/Product) — this is what AI agents parse to understand price, availability and identifiers.";
  }
}

function paymentFixLine() {
  return "No recognized agent-compatible payment signal was detected on your homepage. Agentic checkout needs a payment processor that supports token-based agent transactions (e.g. Stripe) visible on your storefront.";
}

// ---------- check builders ----------

function buildRobotsChecks(robotsResult, platform) {
  return AI_BOTS.map((bot) => {
    const entry = robotsResult.bots.find((b) => b.bot === bot);
    const blocked = entry?.blocked;
    return {
      id: `robots-${bot}`,
      layer: "discoverable",
      label: `${bot} can crawl you`,
      status: blocked ? "fail" : "pass",
      detail: !robotsResult.exists
        ? `No robots.txt found — ${bot} is allowed by default.`
        : blocked
        ? `robots.txt blocks ${bot} (User-agent: ${entry.matchedAgent}, Disallow: /).`
        : `robots.txt allows ${bot}${entry?.matchedAgent ? ` (via ${entry.matchedAgent === "*" ? "the default * rule" : entry.matchedAgent})` : ""}.`,
      fix: blocked ? robotsFixLine(bot, platform) : null,
    };
  });
}

function buildLlmsTxtCheck(exists) {
  return {
    id: "llms-txt",
    layer: "discoverable",
    label: "/llms.txt exists",
    status: exists ? "pass" : "fail",
    detail: exists
      ? "/llms.txt was found — agents have a direct, structured summary of your site."
      : "/llms.txt was not found.",
    fix: exists ? null : llmsTxtFixLine(),
  };
}

function buildWellKnownCheck(id, protocolName, result) {
  const status = result.status === "valid" ? "pass" : result.status === "invalid-json" ? "warn" : "fail";
  return {
    id,
    layer: "transactable",
    label: `${protocolName} manifest published`,
    status,
    detail:
      result.status === "valid"
        ? `/.well-known/${protocolName.toLowerCase()} exists and is valid JSON.`
        : result.status === "invalid-json"
        ? `/.well-known/${protocolName.toLowerCase()} exists but isn't valid JSON.`
        : `/.well-known/${protocolName.toLowerCase()} was not found.`,
    fix: status === "pass" ? null : wellKnownFixLine(protocolName),
  };
}

function buildHomepageSchemaCheck(hasAnyJsonLd, platform) {
  return {
    id: "homepage-schema",
    layer: "readable",
    label: "Homepage has structured data",
    status: hasAnyJsonLd ? "pass" : "fail",
    detail: hasAnyJsonLd
      ? "The homepage includes JSON-LD structured data."
      : "No JSON-LD structured data found on the homepage.",
    fix: hasAnyJsonLd ? null : homepageSchemaFixLine(platform),
  };
}

function buildProductSchemaCheck({ productUrl, fetched, hasAnyJsonLd, product, fieldCheck }, platform) {
  if (!productUrl) {
    return {
      id: "product-schema",
      layer: "readable",
      label: "Product page has complete Product/Offer schema",
      status: "unknown",
      detail: "Couldn't find a product page to check (no sitemap or on-page product link discovered).",
      fix: null,
    };
  }
  if (!fetched) {
    return {
      id: "product-schema",
      layer: "readable",
      label: "Product page has complete Product/Offer schema",
      status: "unknown",
      detail: `Found a product page at ${productUrl} but couldn't fetch it to check.`,
      fix: null,
    };
  }
  if (!product) {
    return {
      id: "product-schema",
      layer: "readable",
      label: "Product page has complete Product/Offer schema",
      status: "fail",
      detail: hasAnyJsonLd
        ? `Checked ${productUrl} — found structured data, but no schema.org Product block.`
        : `Checked ${productUrl} — no JSON-LD structured data found at all.`,
      fix: productSchemaFixLine(platform),
    };
  }
  const allPresent = fieldCheck.missing.length === 0;
  return {
    id: "product-schema",
    layer: "readable",
    label: "Product page has complete Product/Offer schema",
    status: allPresent ? "pass" : "warn",
    detail: allPresent
      ? `Checked ${productUrl} — Product schema includes all required fields (${fieldCheck.present.join(", ")}).`
      : `Checked ${productUrl} — Product schema is missing: ${fieldCheck.missing.join(", ")}.`,
    fix: allPresent ? null : productSchemaFixLine(platform),
  };
}

function buildPaymentCheck(stripeDetected) {
  return {
    id: "payment-signal",
    layer: "transactable",
    label: "Agent-compatible payment signal detected",
    status: stripeDetected ? "pass" : "fail",
    detail: stripeDetected
      ? "Stripe.js was detected on the homepage."
      : "No recognized payment-processor script (e.g. Stripe.js) was detected on the homepage.",
    fix: stripeDetected ? null : paymentFixLine(),
  };
}

// ---------- scoring + verdict ----------

const STATUS_POINTS = { pass: 100, warn: 50, fail: 0 };

function layerScore(checks) {
  const scored = checks.filter((c) => c.status !== "unknown");
  if (scored.length === 0) return null; // nothing we could actually check
  const total = scored.reduce((sum, c) => sum + STATUS_POINTS[c.status], 0);
  return Math.round(total / scored.length);
}

// discoverable < 30 means agents likely can't even find the site, which
// makes the other two layers moot regardless of their own scores.
function computeVerdict({ discoverable, readable, transactable }) {
  if (discoverable !== null && discoverable < 30) return "INVISIBLE TO AGENTS";
  const scores = [discoverable, readable, transactable].filter((s) => s !== null);
  if (scores.length === 0) return "INVISIBLE TO AGENTS";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 70 && scores.every((s) => s >= 50)) return "AGENT-READY";
  return "PARTIALLY READY";
}

// Assembles every check + layer scores + verdict from the raw signals
// gathered by app/api/audit/route.js. Pure — no fetching here.
export function buildAuditResult({
  domain,
  platform,
  robotsResult,
  llmsTxtExists,
  ucpResult,
  acpResult,
  homepageHasJsonLd,
  productCheck,
  stripeDetected,
}) {
  const checks = [
    ...buildRobotsChecks(robotsResult, platform),
    buildLlmsTxtCheck(llmsTxtExists),
    buildHomepageSchemaCheck(homepageHasJsonLd, platform),
    buildProductSchemaCheck(productCheck, platform),
    buildWellKnownCheck("ucp", "UCP", ucpResult),
    buildWellKnownCheck("acp", "ACP", acpResult),
    buildPaymentCheck(stripeDetected),
  ];

  const byLayer = (layer) => checks.filter((c) => c.layer === layer);
  const layers = {
    discoverable: { checks: byLayer("discoverable"), score: layerScore(byLayer("discoverable")) },
    readable: { checks: byLayer("readable"), score: layerScore(byLayer("readable")) },
    transactable: { checks: byLayer("transactable"), score: layerScore(byLayer("transactable")) },
  };

  const verdict = computeVerdict({
    discoverable: layers.discoverable.score,
    readable: layers.readable.score,
    transactable: layers.transactable.score,
  });

  return { domain, platform, verdict, layers, checks };
}

// Pure builders for the Fix Generator's two outputs: per-product
// schema.org Product JSON-LD, and a site-level llms.txt. No fetching here
// — app/api/fix/route.js gathers the raw data (via lib/claudeClient.js's
// extractProductData for products, and plain regex extraction below for
// the homepage's own already-published title/description) and hands it to
// these functions. Every field is conditional on real data being present
// — never a guessed default (rule 2: never fabricate). A schema.org
// Product with no Offer at all is a valid, honest object; a Product with
// an invented "InStock" is not.

const SCHEMA_AVAILABILITY = {
  InStock: "https://schema.org/InStock",
  OutOfStock: "https://schema.org/OutOfStock",
  PreOrder: "https://schema.org/PreOrder",
};

// product: the shape lib/claudeClient.js's extractProductData() returns —
// {name, price, currency, availability, image, description, brand}, any
// field possibly null. Returns a plain object (not a string) — callers
// decide how to render it (JSON.stringify for the copy-paste block,
// straight through for the API response).
export function buildProductJsonLd(product, url) {
  const jsonLd = { "@context": "https://schema.org/", "@type": "Product", name: product.name, url };
  if (product.description) jsonLd.description = product.description;
  if (product.image) jsonLd.image = product.image;
  if (product.brand) jsonLd.brand = { "@type": "Brand", name: product.brand };

  const offer = { "@type": "Offer", url };
  if (product.price != null && !Number.isNaN(Number(product.price))) offer.price = String(product.price);
  if (product.currency) offer.priceCurrency = product.currency;
  if (product.availability && SCHEMA_AVAILABILITY[product.availability]) {
    offer.availability = SCHEMA_AVAILABILITY[product.availability];
  }
  // An Offer carrying nothing but the url isn't meaningfully different
  // from no Offer at all, and risks reading as a placeholder — only
  // attach it once it has at least one real commerce field.
  if (offer.price || offer.priceCurrency || offer.availability) {
    jsonLd.offers = offer;
  }
  return jsonLd;
}

export function jsonLdScriptTag(jsonLd) {
  return `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
}

// Purely extractive (never generated) — the homepage's own already-
// published <title>/<meta name="description">, so llms.txt's brand line
// is real text the site already put in front of visitors, not an
// invented summary.
export function extractMetaDescription(html) {
  const m =
    html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return m ? m[1].trim() || null : null;
}

export function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() || null : null;
}

// domain, brandDescription/title: from the homepage (see extractors
// above). products: [{name, url, description}] — only successfully-
// extracted ones, in the same "never invent" spirit; a product that
// couldn't be parsed just doesn't get a line, it doesn't get a placeholder
// one. Format follows llmstxt.org's convention (H1, blockquote summary,
// H2 sections of markdown links).
export function buildLlmsTxt({ domain, title, description, products }) {
  const lines = [`# ${title || domain}`, ""];
  if (description) lines.push(`> ${description}`, "");

  const realProducts = (products || []).filter((p) => p.name);
  if (realProducts.length > 0) {
    lines.push("## Products", "");
    realProducts.forEach((p) => {
      lines.push(`- [${p.name}](${p.url})${p.description ? `: ${p.description}` : ""}`);
    });
    lines.push("");
  }

  lines.push("## Contact", "", `- Website: https://${domain}`, "");
  return lines.join("\n");
}

// ---------- Product URL normalization + dedup ----------
// Strips trailing slash, common tracking/variant query params, fragment
// and a leading "www." before de-duping discovered product URLs — the
// same page reached two different ways (a sitemap entry and a homepage
// link, say) must never become two separate "fixes" for the same product.
const DROP_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "variant", "fbclid", "gclid"];

export function normalizeProductUrl(url) {
  try {
    const u = new URL(url);
    u.hostname = u.hostname.replace(/^www\./, "");
    u.hash = "";
    DROP_PARAMS.forEach((p) => u.searchParams.delete(p));
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    const search = u.searchParams.toString();
    return `${u.protocol}//${u.hostname}${u.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return url;
  }
}

// ---------- Generated-code validation ----------
// Every piece of JSON-LD app/api/fix/route.js is about to show a merchant
// passes through here first. Never displays broken code as if it were
// ready to paste (rule 2's flip side: never invent success either).
function isValidUrl(u) {
  try {
    new URL(u);
    return true;
  } catch {
    return false;
  }
}

// Fields buildProductJsonLd() must never attach without real underlying
// data — this is a regression guard, not new generation logic: the
// function already only writes fields it was actually given.
const NEVER_INVENTED_FIELDS = ["aggregateRating", "review", "sku", "gtin", "gtin8", "gtin12", "gtin13", "mpn"];

export function validateGeneratedJsonLd(jsonLd) {
  if (!jsonLd || typeof jsonLd !== "object") return { ok: false, reason: "not a valid object" };
  if (jsonLd["@context"] !== "https://schema.org/") return { ok: false, reason: "missing or invalid @context" };
  if (jsonLd["@type"] !== "Product") return { ok: false, reason: "missing or invalid @type" };
  if (!jsonLd.name || typeof jsonLd.name !== "string" || !jsonLd.name.trim()) {
    return { ok: false, reason: "missing product name" };
  }
  if (!jsonLd.url || !isValidUrl(jsonLd.url)) return { ok: false, reason: "missing or invalid url" };

  if (jsonLd.offers) {
    const offer = jsonLd.offers;
    if (offer.price !== undefined) {
      const n = Number(offer.price);
      if (Number.isNaN(n) || n < 0) return { ok: false, reason: "invalid price" };
      if (!offer.priceCurrency) return { ok: false, reason: "price present without a currency" };
    }
  }

  const invented = NEVER_INVENTED_FIELDS.filter((k) => jsonLd[k] !== undefined);
  if (invented.length > 0) return { ok: false, reason: `invented field(s) present: ${invented.join(", ")}` };

  return { ok: true };
}

// ---------- Already-complete detection ----------
// True when a product page's EXISTING JSON-LD (already fetched during
// extraction — lib/audit/jsonld.js's findProductSchema/
// validateProductFields, the same functions the audit itself uses)
// already covers every required field. app/api/fix/route.js marks that
// product "already-good" instead of generating a duplicate, never-differing
// Product block on top of one that's already correct.
export function productAlreadyComplete(hasAnyJsonLd, fieldCheck) {
  return Boolean(hasAnyJsonLd) && Boolean(fieldCheck) && Array.isArray(fieldCheck.missing) && fieldCheck.missing.length === 0;
}

// ---------- One reusable, dynamic template (Shopify / WooCommerce) ----------
// Instead of N static per-product JSON-LD blocks, platforms with a real
// dynamic-templating target get ONE paste-once snippet that reads the
// CURRENT product page's own fields at render time — every optional
// field is wrapped in the platform's own conditional syntax, so a
// product missing that field on the live site simply omits it, the same
// "never invent a value" discipline buildProductJsonLd() already applies
// to static blocks, just expressed as template logic instead of a
// pre-computed value. Magento/Salla/Zid/Wix/custom have no safe dynamic
// target to generate against and keep the existing per-product static
// JSON-LD.
export function buildShopifyLiquidSnippet() {
  return `<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": {{ product.title | json }},
  "url": {{ shop.url | append: product.url | json }}{% if product.description %},
  "description": {{ product.description | strip_html | json }}{% endif %}{% if product.featured_image %},
  "image": {{ product.featured_image | image_url | prepend: "https:" | json }}{% endif %}{% if product.vendor %},
  "brand": { "@type": "Brand", "name": {{ product.vendor | json }} }{% endif %}{% if product.selected_or_first_available_variant.price %},
  "offers": {
    "@type": "Offer",
    "url": {{ shop.url | append: product.url | json }},
    "price": {{ product.selected_or_first_available_variant.price | money_without_currency | json }},
    "priceCurrency": {{ cart.currency.iso_code | json }},
    "availability": {% if product.selected_or_first_available_variant.available %}"https://schema.org/InStock"{% else %}"https://schema.org/OutOfStock"{% endif %}
  }{% endif %}
}
</script>`;
}

export function buildWooCommercePhpSnippet() {
  return `<?php
// Paste as a PHP snippet (e.g. via WPCode), set to run on single product pages only.
if ( function_exists('is_product') && is_product() ) {
  global $product;
  if ( $product ) {
    $data = [
      '@context' => 'https://schema.org/',
      '@type' => 'Product',
      'name' => $product->get_name(),
      'url' => get_permalink( $product->get_id() ),
    ];
    if ( $product->get_description() ) {
      $data['description'] = wp_strip_all_tags( $product->get_description() );
    }
    $image_id = $product->get_image_id();
    if ( $image_id ) {
      $data['image'] = wp_get_attachment_image_url( $image_id, 'full' );
    }
    if ( $product->get_price() !== '' ) {
      $data['offers'] = [
        '@type' => 'Offer',
        'url' => get_permalink( $product->get_id() ),
        'price' => $product->get_price(),
        'priceCurrency' => get_woocommerce_currency(),
        'availability' => $product->is_in_stock() ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      ];
    }
    echo '<script type="application/ld+json">' . wp_json_encode( $data ) . '</script>';
  }
}
`;
}

// Platforms with a real reusable dynamic-templating target — everyone
// else keeps the per-product static JSON-LD flow unchanged.
export const REUSABLE_TEMPLATE_PLATFORMS = new Set(["shopify", "woocommerce"]);

export function buildReusableSnippet(platform) {
  if (platform === "shopify") return buildShopifyLiquidSnippet();
  if (platform === "woocommerce") return buildWooCommercePhpSnippet();
  return null;
}

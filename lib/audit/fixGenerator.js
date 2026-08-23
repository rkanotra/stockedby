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

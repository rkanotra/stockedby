// No JS execution / no headless browser (per spec) — JSON-LD is extracted
// straight from the raw HTML text with a regex, not a DOM parse. Good
// enough: JSON-LD lives in <script> tags, which don't require layout or
// script execution to read.
export function extractJsonLd(html) {
  const blocks = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch {
      // malformed JSON-LD block — skip it, don't fail the whole page
    }
  }
  return blocks;
}

function flattenNodes(blocks) {
  const out = [];
  for (const b of blocks) {
    if (Array.isArray(b)) out.push(...b);
    else if (b && Array.isArray(b["@graph"])) out.push(...b["@graph"]);
    else if (b) out.push(b);
  }
  return out;
}

function typeMatches(node, typeName) {
  const t = node?.["@type"];
  if (!t) return false;
  const list = Array.isArray(t) ? t : [t];
  return list.some((x) => String(x).toLowerCase() === typeName.toLowerCase());
}

// { hasAnyJsonLd, product } — product is the first schema.org Product node
// found (including inside @graph), or null.
export function findProductSchema(html) {
  const blocks = extractJsonLd(html);
  const nodes = flattenNodes(blocks);
  const product = nodes.find((n) => typeMatches(n, "Product")) || null;
  return { hasAnyJsonLd: blocks.length > 0, product };
}

const REQUIRED_FIELD_LABELS = ["name", "price", "priceCurrency", "availability", "sku/gtin", "image"];

// { present: string[], missing: string[], score } — score is present/6 * 100.
export function validateProductFields(product) {
  if (!product) return { present: [], missing: REQUIRED_FIELD_LABELS, score: 0 };

  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
  const present = [];
  const missing = [];
  const check = (label, value) => {
    const has = value !== undefined && value !== null && value !== "";
    (has ? present : missing).push(label);
  };

  check("name", product.name);
  check("price", offers?.price);
  check("priceCurrency", offers?.priceCurrency);
  check("availability", offers?.availability);
  check("sku/gtin", product.sku || product.gtin || product.gtin13 || product.gtin12 || product.gtin8 || product.mpn);
  check("image", product.image);

  return { present, missing, score: Math.round((present.length / REQUIRED_FIELD_LABELS.length) * 100) };
}

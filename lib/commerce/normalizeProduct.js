// Pure: Shopify's raw REST product JSON -> the normalized shape every
// other Phase 2 piece reads (lib/commerce/readiness.js, lib/shopify/
// stores.js's catalog persistence). Kept separate from readiness scoring
// so a future second commerce platform (never rebuilt/rewritten, just
// added) only ever needs its own normalizeXProduct() feeding the SAME
// readiness logic — the same "one derivation layer, many surfaces"
// principle as lib/founderReport.js.
function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeVariant(raw) {
  const inventoryQuantity = typeof raw?.inventory_quantity === "number" ? raw.inventory_quantity : null;
  // "Availability is known" means the store either tracks inventory (so a
  // real in-stock/out-of-stock answer exists) or explicitly allows
  // continued selling past zero stock (Shopify's own "continue" policy) —
  // never guessed when neither signal is present.
  const availabilityKnown = raw?.inventory_management ? inventoryQuantity !== null : raw?.inventory_policy === "continue";
  return {
    shopifyVariantId: String(raw?.id ?? ""),
    title: raw?.title || "",
    sku: raw?.sku || null,
    price: toNumberOrNull(raw?.price),
    compareAtPrice: toNumberOrNull(raw?.compare_at_price),
    inventoryQuantity,
    available: availabilityKnown ? (inventoryQuantity ?? 0) > 0 || raw?.inventory_policy === "continue" : null,
  };
}

export function normalizeProduct(raw) {
  const description = stripHtml(raw?.body_html);
  const images = Array.isArray(raw?.images) ? raw.images.map((img) => img?.src).filter(Boolean) : [];
  const variants = Array.isArray(raw?.variants) ? raw.variants.map(normalizeVariant) : [];
  const skus = variants.map((v) => v.sku).filter(Boolean);

  return {
    shopifyProductId: String(raw?.id ?? ""),
    title: (raw?.title || "").trim(),
    handle: raw?.handle || "",
    description,
    descriptionLength: description.length,
    productType: (raw?.product_type || "").trim(),
    vendor: raw?.vendor || "",
    tags: typeof raw?.tags === "string" ? raw.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    status: raw?.status || "unknown",
    images,
    variants,
    // A single-variant product with no SKU at all doesn't count as
    // "unique" (there's nothing to be unique among) — only a real,
    // non-empty SKU on every variant, with no duplicates, passes.
    hasUniqueSkus: variants.length > 0 && skus.length === variants.length && new Set(skus).size === skus.length,
  };
}

export const MAX_PRODUCTS = 25;
export const FRESH_FOR_MS = 7 * 24 * 60 * 60 * 1000;
export const EMPTY_CATALOG = {
  name: "",
  domain: "",
  delivery: "",
  returns: "",
  products: [],
};

export function publicHttpsUrl(value) {
  try {
    const u = new URL(value);
    const h = u.hostname.toLowerCase();
    if (
      u.protocol !== "https:" ||
      u.username ||
      u.password ||
      u.port ||
      !h.includes(".") ||
      /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[)/.test(h) ||
      /\.(local|internal|localhost)$/.test(h) ||
      /^\d+(\.\d+){3}$/.test(h)
    )
      return null;
    u.hash = "";
    return u;
  } catch {
    return null;
  }
}
const text = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export function cleanCatalog(input) {
  if (
    !input ||
    !Array.isArray(input.products) ||
    input.products.length > MAX_PRODUCTS
  )
    throw new Error(`Add up to ${MAX_PRODUCTS} products.`);
  return {
    name: text(input.name, 100),
    domain: text(input.domain, 250),
    delivery: text(input.delivery, 600),
    returns: text(input.returns, 600),
    products: input.products.map((p) => ({
      sku: text(p?.sku, 80),
      title: text(p?.title, 160),
      description: text(p?.description, 2000),
      price: text(String(p?.price ?? ""), 12),
      availability: ["InStock", "OutOfStock", "PreOrder"].includes(
        p?.availability,
      )
        ? p.availability
        : "",
      url: text(p?.url, 600),
      image: text(p?.image, 600),
    })),
  };
}
export function inspectCatalog(catalog) {
  const issues = [];
  const store = publicHttpsUrl(catalog.domain);
  if (!catalog.name) issues.push("Add your store name.");
  if (!store) issues.push("Enter a public HTTPS store address.");
  if (!catalog.delivery)
    issues.push("Explain delivery areas, costs and timing.");
  if (!catalog.returns) issues.push("Explain your return policy.");
  if (!catalog.products.length) issues.push("Add at least one product.");
  const skus = new Set();
  catalog.products.forEach((p, i) => {
    const prefix = `Product ${i + 1}: `;
    if (!p.sku || skus.has(p.sku.toLowerCase()))
      issues.push(prefix + "use a unique SKU.");
    skus.add(p.sku.toLowerCase());
    if (p.title.length < 3) issues.push(prefix + "add a clear title.");
    if (p.description.length < 40)
      issues.push(prefix + "add a description of at least 40 characters.");
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(p.price) || Number(p.price) <= 0)
      issues.push(prefix + "enter a price greater than zero in rupees.");
    if (!p.availability) issues.push(prefix + "confirm stock status.");
    const url = publicHttpsUrl(p.url);
    if (
      !url ||
      !store ||
      url.hostname.replace(/^www\./, "") !==
        store.hostname.replace(/^www\./, "")
    )
      issues.push(prefix + "use a product link on your store domain.");
    if (!publicHttpsUrl(p.image))
      issues.push(prefix + "add a public HTTPS image link.");
  });
  return { ready: issues.length === 0, issues };
}
export function buildAgentCatalog(catalog, updatedAt, now = Date.now()) {
  const fresh =
    Number.isFinite(Date.parse(updatedAt)) &&
    now - Date.parse(updatedAt) <= FRESH_FOR_MS &&
    Date.parse(updatedAt) <= now;
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${catalog.name} product catalog`,
    dateModified: updatedAt,
    numberOfItems: catalog.products.length,
    stockedby: {
      version: 1,
      source: "merchant supplied",
      freshness: fresh ? "updated within 7 days" : "needs merchant refresh",
      currency: "INR",
      delivery: catalog.delivery,
      returns: catalog.returns,
      checkout:
        "Continue on the merchant website; shopper approval and payment happen there.",
    },
    itemListElement: catalog.products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        sku: p.sku,
        name: p.title,
        description: p.description,
        image: p.image,
        url: p.url,
        ...(fresh
          ? {
              offers: {
                "@type": "Offer",
                price: p.price,
                priceCurrency: "INR",
                availability: `https://schema.org/${p.availability}`,
                url: p.url,
                seller: {
                  "@type": "Organization",
                  name: catalog.name,
                  url: catalog.domain,
                },
              },
            }
          : {}),
      },
    })),
  };
}
export function buildAgentText(catalog, feedUrl, updatedAt) {
  const plain = (s) => s.replace(/[\r\n]+/g, " ");
  return `# ${plain(catalog.name)}\n\nMerchant-maintained product catalog for India.\n\n- Store: ${catalog.domain}\n- Product data: ${feedUrl}\n- Updated: ${updatedAt}\n\n## Delivery\n${catalog.delivery}\n\n## Returns\n${catalog.returns}\n\n## Buying\nFollow each product URL to the merchant website. Confirm current price and stock there. This feed does not authorize purchases or collect payment.\n`;
}
export function isActiveAccess(until, now = Date.now()) {
  return Number.isFinite(Date.parse(until)) && Date.parse(until) > now;
}

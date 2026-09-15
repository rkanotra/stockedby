export const CHECK_PACK_CREDITS = 20;
export const RUN_LABELS = {
  queued: "Queued",
  running: "Checking",
  completed: "Report ready",
  failed: "Could not run",
  cancelled: "Cancelled",
};
export const RESULT_LABELS = {
  pass: "Passed within scope",
  issue: "Needs a fix",
  unknown: "Unable to verify",
};
export function invalid(message) {
  return Object.assign(new Error(message), { status: 400 });
}
export function storeOrigin(value) {
  let url;
  try {
    url = new URL(value?.includes("://") ? value : `https://${value}`);
  } catch {
    throw invalid("Enter your store’s website address.");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local")
  )
    throw invalid("Use a public HTTPS store address.");
  return url.origin;
}
export function validateCase(input, origin) {
  if (!input || typeof input !== "object")
    throw invalid("Add a purchase journey.");
  const label = String(input.label || "")
    .trim()
    .slice(0, 100);
  if (!label) throw invalid("Give this journey a name.");
  let product;
  try {
    product = new URL(input.productUrl);
  } catch {
    throw invalid("Paste the full Shopify product link.");
  }
  if (
    product.origin !== origin ||
    !/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?products\/[a-z0-9_-]+\/?$/i.test(
      product.pathname,
    ) ||
    product.username ||
    product.password
  )
    throw invalid("Use a product link on this verified store.");
  const variantId = String(
    input.variantId || product.searchParams.get("variant") || "",
  );
  if (
    !/^[1-9]\d{0,15}$/.test(variantId) ||
    !Number.isSafeInteger(Number(variantId))
  )
    throw invalid("Choose the exact Shopify variant to check.");
  const expectedPrice = Number(input.expectedPrice);
  if (
    input.expectedPrice === "" ||
    input.expectedPrice == null ||
    !Number.isFinite(expectedPrice) ||
    expectedPrice <= 0 ||
    expectedPrice > 1000000 ||
    Math.abs(expectedPrice * 100 - Math.round(expectedPrice * 100)) > 0.00001
  )
    throw invalid(
      "Enter the expected unit price in rupees, with up to two decimals.",
    );
  const pin = String(input.pin || "").trim();
  if (!/^[1-9]\d{5}$/.test(pin))
    throw invalid("Enter a six-digit Indian delivery PIN code.");
  const province = String(input.province || "").trim();
  if (!province || province.length > 60)
    throw invalid("Enter the delivery state or union territory.");
  const discount = String(input.discount || "").trim();
  if (discount.length > 60 || /[\u0000-\u001f<>]/.test(discount))
    throw invalid("Enter a valid discount code.");
  const expectedCart =
    input.expectedCart === "" || input.expectedCart == null
      ? null
      : Number(input.expectedCart);
  if (
    expectedCart !== null &&
    (!Number.isFinite(expectedCart) ||
      expectedCart < 0 ||
      expectedCart > 1000000 ||
      Math.abs(expectedCart * 100 - Math.round(expectedCart * 100)) > 0.00001)
  )
    throw invalid("Enter an expected cart subtotal with up to two decimals.");
  if (discount && expectedCart === null)
    throw invalid(
      "For a discount, enter the expected cart subtotal after discount.",
    );
  const maxShipping =
    input.maxShipping === "" || input.maxShipping == null
      ? null
      : Number(input.maxShipping);
  if (
    maxShipping !== null &&
    (!Number.isFinite(maxShipping) ||
      maxShipping < 0 ||
      maxShipping > 100000 ||
      Math.abs(maxShipping * 100 - Math.round(maxShipping * 100)) > 0.00001)
  )
    throw invalid("Enter a valid maximum shipping charge.");
  if (input.confirmed !== true)
    throw invalid(
      "Confirm that these are your store’s intended purchase rules.",
    );
  return {
    label,
    productUrl: `${product.origin}${product.pathname.replace(/\/$/, "")}`,
    variantId,
    expectedPricePaise: Math.round(expectedPrice * 100),
    pin,
    province,
    discount,
    expectedCartPaise:
      expectedCart === null ? null : Math.round(expectedCart * 100),
    maxShippingPaise:
      maxShipping === null ? null : Math.round(maxShipping * 100),
    expectedAvailable: input.expectedAvailable !== false,
    currency: "INR",
    confirmed: true,
  };
}
export function verdict(checks) {
  if (checks.some((c) => c.status === "issue")) return "issue";
  return checks.some((c) => c.status === "unknown") || !checks.length
    ? "unknown"
    : "pass";
}
export function compareRuns(previous, current) {
  if (
    !previous ||
    !current ||
    JSON.stringify(previous.config) !== JSON.stringify(current.config)
  )
    return null;
  const before = new Map(
    (previous.result?.checks || []).map((c) => [c.code, c]),
  );
  return (current.result?.checks || [])
    .filter((c) => before.has(c.code))
    .map((c) => ({
      code: c.code,
      title: c.title,
      before: before.get(c.code).status,
      after: c.status,
      resolved: before.get(c.code).status === "issue" && c.status === "pass",
    }));
}
export function formatMoney(paise) {
  return typeof paise === "number" && Number.isFinite(paise)
      ? `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`
    : "Not available";
}
export function isOperator(merchant, email) {
  return Boolean(
    merchant?.email &&
      email &&
      merchant.email.toLowerCase() === email.trim().toLowerCase(),
  );
}

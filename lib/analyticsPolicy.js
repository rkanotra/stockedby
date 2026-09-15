export function validMeasurementId(id) {
  return /^G-[A-Z0-9]{5,20}$/.test(id || "");
}
export function analyticsPath(path) {
  if (path.startsWith('/dashboard/purchase-check/')) return '/dashboard/purchase-check/[check]';
  if (path.startsWith("/report/")) return "/report/[report]";
  if (path.startsWith("/stores/")) return "/stores/[store]";
  if (path.startsWith("/api/")) return null;
  return path.split(/[?#]/)[0];
}
export function safeAnalyticsParams(params) {
  const safe = {};
  for (const [key, value] of Object.entries(params || {})) {
    if (
      key === "product_count" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 25
    )
      safe[key] = value;
    if (key === "full_report_expanded" && typeof value === "boolean")
      safe[key] = value;
    if (
      key === "platform" &&
      ["shopify", "woocommerce", "custom", "unknown"].includes(value)
    )
      safe[key] = value;
  }
  return safe;
}

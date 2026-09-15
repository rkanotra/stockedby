const ALLOWED = new Set([
  "/dashboard",
  "/dashboard/agent-store",
  "/checkout/agent-store",
  "/dashboard/payments",
  "/dashboard/purchase-check",
  "/dashboard/operations",
]);
export function safeReturnPath(path) {
  return ALLOWED.has(path) ||
    /^\/dashboard\/purchase-check\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      path || "",
    )
    ? path
    : "/dashboard";
}

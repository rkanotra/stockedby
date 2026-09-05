// Shared guard for app/api/admin/* routes (Phase 1.5 — the ai_observations
// backfill + diagnostic tools). These are operator-invoked write/
// introspection tools, not merchant-facing features, so an unset
// ADMIN_TOKEN means "not configured" (501) rather than the silent no-op
// every other optional key in this app degrades to (GEMINI_API_KEY,
// SUPABASE_URL, ...) — those protect a merchant-facing feature that must
// keep working without them; these protect write access to historical data
// and must never look like they succeeded when nothing checked the token.
export function requireAdmin(request) {
  const configured = process.env.ADMIN_TOKEN;
  if (!configured) return { ok: false, status: 501, error: "ADMIN_TOKEN is not configured." };
  const provided = request.headers.get("x-admin-token");
  if (!provided || provided !== configured) return { ok: false, status: 401, error: "Unauthorized." };
  return { ok: true };
}

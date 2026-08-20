// Simple per-IP daily cap to protect the ANTHROPIC_API_KEY budget (hard rule
// 9). In-memory only — resets on cold start / doesn't share state across
// serverless instances. That's an accepted MVP tradeoff; real persistent
// rate limiting is deferred post-MVP (CLAUDE.md build phase 5).
const DAILY_LIMIT = 10;
const hits = new Map(); // `${ip}:${date}` -> count

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export function getClientIp(request) {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

// namespace keeps separate callers (e.g. /api/test vs /api/audit) on
// separate counters — one endpoint's traffic shouldn't burn another's cap.
// Returns { allowed, remaining, limit }. Increments the counter only when allowed.
export function checkAndConsume(ip, { namespace = "test", limit = DAILY_LIMIT } = {}) {
  const key = `${namespace}:${ip}:${todayUTC()}`;
  const count = hits.get(key) || 0;
  if (count >= limit) {
    return { allowed: false, remaining: 0, limit };
  }
  hits.set(key, count + 1);
  return { allowed: true, remaining: limit - (count + 1), limit };
}

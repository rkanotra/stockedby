import { fetchTextSafe } from "./fetchWithTimeout";

export const AUDIT_UA = "StockedBy-AgentAudit/1.0 (+https://stockedby.com)";

// The parallel fetch wave every audit-style check starts from — robots.txt,
// llms.txt, the two agentic-checkout manifests, the homepage, and
// sitemap.xml. Extracted out of app/api/audit/route.js so app/api/fix/
// route.js can gather the exact same "before" signals (for its
// before/after "Verify it worked" comparison) without a second, drifting
// copy of this fetch list. Caller must have already run
// lib/audit/ssrfGuard.js's assertPublicHostname() on `hostname` — this
// function doesn't check it again.
export async function gatherAuditSignals(hostname) {
  const base = `https://${hostname}`;
  const headers = { "User-Agent": AUDIT_UA };

  const [robotsTxt, llmsTxt, ucpRaw, acpRaw, homepage, sitemapXml] = await Promise.all([
    fetchTextSafe(`${base}/robots.txt`, { headers }),
    fetchTextSafe(`${base}/llms.txt`, { headers }),
    fetchTextSafe(`${base}/.well-known/ucp`, { headers }),
    fetchTextSafe(`${base}/.well-known/acp`, { headers }),
    fetchTextSafe(`${base}/`, { headers, maxBytes: 3_000_000 }),
    fetchTextSafe(`${base}/sitemap.xml`, { headers }),
  ]);

  return { base, headers, robotsTxt, llmsTxt, ucpRaw, acpRaw, homepage, sitemapXml };
}

export function wellKnownResult({ ok, text }) {
  if (!ok || text === null) return { status: "missing" };
  try {
    JSON.parse(text);
    return { status: "valid" };
  } catch {
    return { status: "invalid-json" };
  }
}

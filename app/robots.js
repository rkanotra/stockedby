import { AI_BOTS } from "@/lib/audit/robots";
import { SITE_URL } from "@/lib/site";

// Allow everything, including AI crawlers — StockedBy's whole business is
// getting brands found by AI, so blocking the same bots would be
// self-defeating. Explicit per-bot Allow rules (not just the wildcard "*")
// so there's no ambiguity for anyone auditing this file. AI_BOTS is the
// same list lib/audit/score.js checks a MERCHANT's site against — single
// source of truth, and "practice what we audit."
export default function robots() {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      ...AI_BOTS.map((bot) => ({ userAgent: bot, allow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

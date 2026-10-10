import { AI_BOTS } from "@/lib/audit/robots";
import { SITE_URL } from "@/lib/site";

// Keep the public side project open to search and AI crawlers while hiding
// the retired account, checkout and saved-report surfaces. Explicit per-bot
// rules keep the policy consistent for every crawler StockedBy audits.
export default function robots() {
  const retiredSurfaces = [
    "/api/",
    "/checkout/",
    "/dashboard/",
    "/login",
    "/report/",
    "/stores/",
  ];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: retiredSurfaces },
      ...AI_BOTS.map((bot) => ({
        userAgent: bot,
        allow: "/",
        disallow: retiredSurfaces,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

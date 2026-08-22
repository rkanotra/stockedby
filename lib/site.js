// Single source of truth for the site's public base URL — used anywhere an
// absolute URL is required (Resend email links, OG meta tags on
// /report/[slug]). Sites like WhatsApp/LinkedIn that unfurl link previews
// need a real absolute URL, not a relative path.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://stockedby.com";

// Single source of truth for the site's public base URL — used anywhere an
// absolute URL is required (Resend email links, OG meta tags on
// /report/[slug]). Sites like WhatsApp/LinkedIn that unfurl link previews
// need a real absolute URL, not a relative path.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://stockedby.com";

// The site-wide dynamic OG image (app/opengraph-image.js). Referenced
// explicitly by every page's own openGraph/twitter metadata below rather
// than relied on via Next's file-convention auto-injection — Next's own
// docs confirm metadata objects are only SHALLOW-merged per route segment
// ("nested fields such as openGraph... are overwritten by the last segment
// to define them"), so a page that sets its own openGraph object (every
// page here does, for a unique title/description) silently drops the
// parent layout's auto-attached image unless it re-includes it itself.
export const OG_IMAGE_URL = `${SITE_URL}/opengraph-image`;

// Every page's openGraph/twitter metadata is built through these two
// helpers instead of writing the object literally — keeps every page's
// share preview fully self-contained (title, description, siteName, type,
// locale, image all present) rather than depending on inheriting fields
// from the root layout that the shallow-merge behavior above would drop.
export function buildOpenGraph({ title, description, path }) {
  return {
    title,
    description,
    url: path,
    siteName: "StockedBy",
    type: "website",
    locale: "en_US",
    images: [{ url: OG_IMAGE_URL, width: 1200, height: 630 }],
  };
}

export function buildTwitter({ title, description }) {
  return {
    card: "summary_large_image",
    title,
    description,
    images: [OG_IMAGE_URL],
  };
}

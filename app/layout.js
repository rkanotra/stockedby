import "./globals.css";
import { SITE_URL, buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "StockedBy — Does AI recommend your brand?";
const DESCRIPTION =
  "Check if ChatGPT, Gemini and Claude recommend your brand. Free AI visibility test for brands in India, UAE and Saudi Arabia.";

// Root-level defaults — every page below sets its own full metadata export
// (title/description/canonical/openGraph/twitter, via lib/site.js's
// buildOpenGraph/buildTwitter) rather than relying on inheriting from
// here, since Next only shallow-merges nested fields like openGraph per
// segment (a child that sets its own openGraph object fully replaces this
// one, not merges into it). This is still a real fallback for any route
// that doesn't override it. metadataBase lets every page use a relative
// path (canonical: "/why") instead of repeating SITE_URL.
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- App Router root layout is the correct place for global fonts */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

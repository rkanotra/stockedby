import Homepage from "@/components/home/Homepage";
import JsonLd from "@/components/JsonLd";
import { SITE_URL, buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "StockedBy — Check if AI recommends your brand | India & the Gulf";
const DESCRIPTION =
  "Free test: see if ChatGPT, Gemini and Claude recommend your brand — or your competitor's. Built for brands across India and the Gulf.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

// Organization + WebApplication — deliberately minimal, every field
// something we can actually stand behind (no fabricated ratings).
// The logo points at the local vector used by the new wordmark.
const ORG_AND_APP_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "StockedBy",
      url: SITE_URL,
      logo: `${SITE_URL}/brand/stockedby-mark.svg`,
      description:
        "A free, independent AI visibility project for brands across India and the Gulf.",
    },
    {
      "@type": "WebApplication",
      name: "StockedBy",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Free one-off tool to check whether ChatGPT, Gemini and Claude recommend your brand and what your website could explain more clearly.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export default function Home() {
  return <><JsonLd data={ORG_AND_APP_JSON_LD} /><Homepage /></>;
}

import Marketing from "@/components/studio/Marketing";
import JsonLd from "@/components/JsonLd";
import { SITE_URL, buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "StockedBy — Your product thinking, connected.";
const DESCRIPTION =
  "An AI workspace for product managers and business analysts. Bring company standards, build your workflow, and connect briefs, requirements, stories and tests.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: buildOpenGraph({
    title: TITLE,
    description: DESCRIPTION,
    path: "/",
  }),
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
      logo: `${SITE_URL}/icon.svg`,
      description:
        "An independent product delivery workspace for product managers and business analysts.",
    },
    {
      "@type": "WebApplication",
      name: "StockedBy",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "A configurable AI product workflow with company standards, connected documents, local project storage and portable exports.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

export default function Home() {
  return (
    <>
      <JsonLd data={ORG_AND_APP_JSON_LD} />
      <Marketing />
    </>
  );
}

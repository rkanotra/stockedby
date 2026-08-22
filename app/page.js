import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import PromiseStrip from "@/components/PromiseStrip";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
import JsonLd from "@/components/JsonLd";
import { SITE_URL, buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "StockedBy — Check if AI recommends your brand | India, UAE, Saudi Arabia";
const DESCRIPTION =
  "Free test: see if ChatGPT, Gemini and Claude recommend your brand — or your competitor's. Built for brands in India, UAE and Saudi Arabia.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

// Organization + WebApplication — deliberately minimal, every field
// something we can actually stand behind (no invented sameAs social
// profiles, no fabricated ratings). logo points at the real deployed
// apple-icon.png (hard rule 5's favicon), not a placeholder.
const ORG_AND_APP_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "StockedBy",
      url: SITE_URL,
      logo: `${SITE_URL}/apple-icon.png`,
      description:
        "AI visibility scoring and agent-readiness tools for brands in India, UAE and Saudi Arabia.",
    },
    {
      "@type": "WebApplication",
      name: "StockedBy",
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Free tool to check whether ChatGPT, Gemini and Claude recommend your brand, and whether AI agents can read and buy from your store.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

// Homepage philosophy (CLAUDE.md): the homepage is the door — Nav, Hero,
// one promise strip (incl. the audit-promo card), Footer. The pillar/
// markets/data/compare sections live on /why (app/why/page.js); the
// 3-step how-it-works section lives on /how (app/how/page.js) — reachable
// from Nav's "Why StockedBy" / "How it works" links, not from here.
export default function Home() {
  return (
    <>
      <JsonLd data={ORG_AND_APP_JSON_LD} />
      <div id="top" className="hero-shell">
        <Nav />
        <Hero />
      </div>
      <PromiseStrip />
      <Footer />
      <ScrollReveal />
    </>
  );
}

import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ResultExample from "@/components/ResultExample";
import ProblemStatement from "@/components/ProblemStatement";
import PromiseStrip from "@/components/PromiseStrip";
import Markets from "@/components/Markets";
import FinalCTA from "@/components/FinalCTA";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";
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
        "AI visibility scoring and agent-readiness tools for brands across India and the Gulf.",
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

// Homepage philosophy (CLAUDE.md, "restraint pass" — narrows the earlier
// "visual/creative revamp" phase's fuller narrative back down): hero, a
// real example, one strong statement, a simple explanation, market proof,
// final CTA. Nothing else. How-it-works detail lives on /how; the
// competitor comparison table lives on /why only — a homepage doesn't
// need to argue with competitors before a visitor understands the
// product, and repeating "how the test works" twice on one page (once as
// three questions, once as three steps) was the same idea explained
// twice. Markets is the SAME component /why already renders (reused, not
// forked) — that page stays untouched and still exists as the deeper
// destination from Nav.
export default function Home() {
  return (
    <>
      <JsonLd data={ORG_AND_APP_JSON_LD} />
      <div id="top" className="hero-shell">
        <Nav />
        <Hero />
      </div>
      <ResultExample />
      <ProblemStatement />
      <PromiseStrip />
      <Markets />
      <FinalCTA />
      <Footer />
      <ScrollReveal />
    </>
  );
}

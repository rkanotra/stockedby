import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ProblemStatement from "@/components/ProblemStatement";
import PromiseStrip from "@/components/PromiseStrip";
import ResultExample from "@/components/ResultExample";
import HowItWorks from "@/components/HowItWorks";
import Markets from "@/components/Markets";
import Compare from "@/components/Compare";
import ImprovementLoop from "@/components/ImprovementLoop";
import AgenticTeaser from "@/components/AgenticTeaser";
import FinalCTA from "@/components/FinalCTA";
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

// Homepage philosophy (CLAUDE.md, "visual/creative revamp" phase —
// supersedes the earlier "homepage is the door" rule): the homepage now
// carries the full narrative — hero, live demo, the problem, what
// StockedBy tells you, a real result example, how it works, why local
// markets matter, why not the US tools, the improvement loop, an agentic-
// commerce teaser, final CTA — rather than pushing everything past Hero
// onto /why and /how. HowItWorks/Markets/Compare are the SAME components
// /how and /why already render (reused, not forked) — those pages stay
// untouched and still exist as deeper destinations from Nav, they just no
// longer hold the ONLY copy of this content.
export default function Home() {
  return (
    <>
      <JsonLd data={ORG_AND_APP_JSON_LD} />
      <div id="top" className="hero-shell">
        <Nav />
        <Hero />
      </div>
      <ProblemStatement />
      <PromiseStrip />
      <ResultExample />
      <HowItWorks />
      <Markets />
      <Compare />
      <ImprovementLoop />
      <AgenticTeaser />
      <FinalCTA />
      <Footer />
      <ScrollReveal />
    </>
  );
}

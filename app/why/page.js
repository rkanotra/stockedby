import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import AisleMonitor from "@/components/AisleMonitor";
import AisleDiagnose from "@/components/AisleDiagnose";
import AisleWin from "@/components/AisleWin";
import AisleProtect from "@/components/AisleProtect";
import Markets from "@/components/Markets";
import DataSection from "@/components/DataSection";
import Compare from "@/components/Compare";
import ScrollReveal from "@/components/ScrollReveal";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "Why StockedBy — AI visibility built for India, UAE and Saudi Arabia";
const DESCRIPTION =
  "AI visibility scoring, fix tooling and agent-readiness infrastructure for brands in India, UAE and Saudi Arabia — not a US tool with your currency swapped in.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/why" },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/why" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

// Homepage philosophy (CLAUDE.md): the homepage is the door, this page is
// where curious/technical visitors and investors read the full picture.
// Every section here is unchanged from the pre-simplification homepage —
// just moved, not rewritten (components/Aisle*.js, Markets.js,
// DataSection.js, Compare.js). HowItWorks.js moved to /how instead, with
// its own story paragraph — see that page.
export default function WhyPage() {
  return (
    <>
      <Nav />
      <div className="wrap page-hero">
        <h1>Why StockedBy</h1>
        <p>
          The three pillars, built for India, UAE and Saudi Arabia specifically — not a US tool
          with your currency swapped in.
        </p>
      </div>
      <AisleMonitor />
      <AisleDiagnose />
      <AisleWin />
      <AisleProtect />
      <Markets />
      <DataSection />
      <Compare />
      <Footer />
      <ScrollReveal />
    </>
  );
}

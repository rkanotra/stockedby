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

export const metadata = {
  title: "Why StockedBy",
  description:
    "AI visibility scoring, GEO fix tooling and agent-readiness infrastructure for brands in India, UAE and Saudi Arabia.",
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

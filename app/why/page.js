import PageShell from "@/components/site/PageShell";
import AisleMonitor from "@/components/AisleMonitor";
import AisleDiagnose from "@/components/AisleDiagnose";
import AisleWin from "@/components/AisleWin";
import AisleProtect from "@/components/AisleProtect";
import Markets from "@/components/Markets";
import DataSection from "@/components/DataSection";
import Compare from "@/components/Compare";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "Why StockedBy — AI visibility built for India and the Gulf";
const DESCRIPTION =
  "AI visibility scoring, fix tooling and agent-readiness infrastructure for brands across India and the Gulf — not a US tool with your currency swapped in.";

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
    <PageShell>
      <div className="wrap page-hero">
        <span className="page-kicker">WHY STOCKEDBY</span>
        <h1>Your market.<br />Your customers. <em>Your shelf.</em></h1>
        <p>
          See your AI visibility in the context that matters: local questions, local competitors,
          and the places your customers actually shop.
        </p>
      </div>
      <AisleMonitor />
      <AisleDiagnose />
      <AisleWin />
      <AisleProtect />
      <Markets />
      <DataSection />
      <Compare />
    </PageShell>
  );
}

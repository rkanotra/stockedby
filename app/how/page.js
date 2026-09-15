import PageShell from "@/components/site/PageShell";
import HowItWorks from "@/components/HowItWorks";
import FaqSection from "@/components/FaqSection";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "How it works — StockedBy";
const DESCRIPTION =
  "Every AI assistant is now a shop — here's how a StockedBy test works, in three steps.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/how" },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/how" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

// The 3-step section (components/HowItWorks.js) unchanged, plus the story
// paragraph that used to only live implicitly across the homepage — moved
// here per the nav restructure, not the ultra-simplified homepage register
// (this is where a curious visitor reads the "why does this matter" case).
export default function HowPage() {
  return (
    <PageShell>
      <div className="wrap page-hero">
        <span className="page-kicker">HOW IT WORKS</span>
        <h1>From your website<br />to a <em>clearer picture.</em></h1>
        <p>Know what AI recommends. Decide what to do next.</p>
      </div>
      <div className="wrap story-block">
        <p className="story-lead">A shopper asks a question.<br />AI makes a shortlist.<br /><em>Where is your brand?</em></p>
        <div><p>StockedBy checks how AI assistants respond to questions about your category. You see the recommendations, the competitors, and the destinations they give shoppers.</p><p>Start with your website, choose a product and market, then review the questions before running the test. Your report brings the answers together in one place.</p></div>
      </div>
      <HowItWorks />
      <FaqSection />
    </PageShell>
  );
}

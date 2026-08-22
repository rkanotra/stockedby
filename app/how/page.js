import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import HowItWorks from "@/components/HowItWorks";
import FaqSection from "@/components/FaqSection";
import ScrollReveal from "@/components/ScrollReveal";
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
    <>
      <Nav />
      <div className="wrap page-hero">
        <h1>How it works</h1>
      </div>
      <div className="wrap story-block">
        <p>
          When someone asks ChatGPT, Gemini or Claude what to buy, the AI doesn&rsquo;t hand back
          ten blue links — it recommends three to five specific brands, ranks them, and tells
          the shopper exactly where to check out. That answer is the new shelf. Win it, and a
          stranger becomes a customer without ever visiting your site. Lose it, and you don&rsquo;t
          get a second chance — the shopper never learns you existed.
        </p>
        <p>
          Most brands have no idea what AI actually says about them. StockedBy runs the same
          questions your customers are already asking, live, across every major AI app — and
          shows you exactly where you stand, in about two minutes.
        </p>
      </div>
      <HowItWorks />
      <FaqSection />
      <Footer />
      <ScrollReveal />
    </>
  );
}

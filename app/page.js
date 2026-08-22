import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import PromiseStrip from "@/components/PromiseStrip";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

// Homepage philosophy (CLAUDE.md): the homepage is the door — Nav, Hero,
// one promise strip (incl. the audit-promo card), Footer. The pillar/
// markets/data/compare sections live on /why (app/why/page.js); the
// 3-step how-it-works section lives on /how (app/how/page.js) — reachable
// from Nav's "Why StockedBy" / "How it works" links, not from here.
export default function Home() {
  return (
    <>
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

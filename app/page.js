import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import PromiseStrip from "@/components/PromiseStrip";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

// Homepage philosophy (CLAUDE.md): the homepage IS the test — hero, one
// promise strip, footer. Education (pillars, markets, data, compare,
// how-it-works) lives in the report and a future /platform page, not here.
// Those sections' components still exist (components/Aisle*.js,
// HowItWorks.js, Markets.js, DataSection.js, Compare.js) — just unused by
// this page for now.
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

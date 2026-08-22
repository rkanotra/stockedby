import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import EngineStrip from "@/components/EngineStrip";
import BrandStory from "@/components/BrandStory";
import AisleMonitor from "@/components/AisleMonitor";
import AisleDiagnose from "@/components/AisleDiagnose";
import AisleWin from "@/components/AisleWin";
import AisleProtect from "@/components/AisleProtect";
import HowItWorks from "@/components/HowItWorks";
import Markets from "@/components/Markets";
import DataSection from "@/components/DataSection";
import Compare from "@/components/Compare";
import CtaReceipt from "@/components/CtaReceipt";
import Footer from "@/components/Footer";
import ScrollReveal from "@/components/ScrollReveal";

export default function Home() {
  return (
    <>
      <div id="top" className="hero-shell">
        <Nav />
        <Hero />
      </div>
      <EngineStrip />
      <BrandStory />
      <AisleMonitor />
      <AisleDiagnose />
      <AisleWin />
      <AisleProtect />
      <HowItWorks />
      <Markets />
      <DataSection />
      <Compare />
      <CtaReceipt />
      <Footer />
      <ScrollReveal />
    </>
  );
}

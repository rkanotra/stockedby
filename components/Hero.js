import { HERO_ENGINES } from "@/lib/heroExample";
import HeroReportCard from "./HeroReportCard";
import DomainCheckForm from "./DomainCheckForm";

export default function Hero() {
  return (
    <header className="hero" id="top-hero">
      <div className="eyebrow">
        <span className="eyebrow-dot" />
        For brands in India and the Gulf
      </div>
      <h1 className="hero-h1-simple">When customers ask AI what to buy, does your brand show up?</h1>
      <DomainCheckForm />
      <div className="hero-note mono">
        Free. 2 minutes. See what ChatGPT, Gemini and Claude tell your customers.
      </div>
      <a href="#result-example" className="hero-see-example mono">
        See an example ↓
      </a>

      {/* product report card mock — tabs + shelf are real snapshot data
          (HERO_ENGINES, from lib/heroExample.js — also read by
          ResultExample.js so the two sections never disagree); verdict/
          SOV/engine-badges below are the unchanging overall-summary mock,
          same across every tab */}
      <div className="report-wrap">
        <div className="report-glow" />
        <div className="report-card">
          <HeroReportCard engines={HERO_ENGINES}>
            <div className="report-col-r">
              <div>
                <div className="report-label">Verdict</div>
                <span className="verdict-badge">ON THE SHELF · #1</span>
                <div className="verdict-warn">⚠ but routed to Amazon — you pay commission on every sale</div>
              </div>
              <div>
                <div className="report-label">Share of AI voice</div>
                <div className="sov-bar">
                  <div style={{ width: "24%", background: "var(--tag)" }} />
                  <div style={{ width: "39%", background: "var(--brick2)" }} />
                  <div style={{ width: "37%", background: "var(--chip-bg)" }} />
                </div>
                <div className="sov-legend">
                  <span style={{ color: "var(--link-hover)" }}>■ you 24%</span>
                  <span style={{ color: "var(--brick)" }}>■ marketplaces 39%</span>
                  <span>■ others 37%</span>
                </div>
              </div>
              <div>
                <div className="report-label">AI apps recommending you</div>
                <div className="engine-badges">
                  <span className="engine-badge yes">ChatGPT ✓</span>
                  <span className="engine-badge yes">Gemini ✓</span>
                  <span className="engine-badge yes">Claude ✓</span>
                </div>
              </div>
            </div>
          </HeroReportCard>
        </div>
      </div>
    </header>
  );
}

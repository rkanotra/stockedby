import Link from "next/link";

export default function Hero() {
  return (
    <header className="hero" id="top-hero">
      <div className="eyebrow">
        <span className="eyebrow-dot" />
        AI &amp; agentic commerce intelligence
      </div>
      <h1 className="hero-h1">
        Does AI put you on the shelf — or <span className="flip">Amazon</span>?
      </h1>
      <p className="hero-sub">
        Your customers now ask ChatGPT, Gemini, Perplexity, Claude and Grok what to buy.
        StockedBy runs their real questions, in their real languages, and shows you exactly
        who gets recommended — you, your rival, or the marketplace giants — and where the AI
        sends the buyer to check out.
      </p>
      <div className="hero-ctas">
        <Link href="/test" className="btn-primary">Test my brand — free</Link>
        <a href="#monitor" className="btn-ghost">See what you get</a>
      </div>
      <div className="hero-note mono">No card. No signup to see your verdict. 2 minutes.</div>

      {/* product report card mock */}
      <div className="report-wrap">
        <div className="report-glow" />
        <div className="report-card">
          <div className="report-topbar">
            <div className="report-dots"><span /><span /><span /></div>
            <span className="report-url">stockedby.com/report/minimalist-vitamin-c</span>
            <span className="report-live">● LIVE · 18 AUG 2026</span>
          </div>
          <div className="report-body">
            <div className="report-col-l">
              <div className="report-label">Query · real shopper set</div>
              <div className="report-query">best vitamin C serum for oily skin</div>
              <div className="report-engines">
                <span className="chip active">Claude</span>
                <span className="chip">ChatGPT</span>
                <span className="chip">Gemini</span>
                <span className="chip">Grok</span>
                <span className="chip">Perplexity</span>
                <span className="chip">Copilot</span>
              </div>
              <div className="rank-list">
                <div className="rank-row you">
                  <span className="rank-n">#1</span>
                  <span className="rank-brand">Minimalist</span>
                  <span className="rank-you-badge">YOU</span>
                  <span className="rank-dest mktpl">→ amazon.in</span>
                </div>
                <div className="rank-row">
                  <span className="rank-n">#2</span>
                  <span className="rank-brand">Derma Co</span>
                  <span className="rank-dest mktpl">→ amazon.in</span>
                </div>
                <div className="rank-row">
                  <span className="rank-n">#3</span>
                  <span className="rank-brand">Dot &amp; Key</span>
                  <span className="rank-dest mktpl">→ nykaa.com</span>
                </div>
                <div className="rank-row">
                  <span className="rank-n">#4</span>
                  <span className="rank-brand">Pilgrim</span>
                  <span className="rank-dest direct">→ direct</span>
                </div>
              </div>
            </div>
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
                <div className="report-label">Engines stocking you</div>
                <div className="engine-badges">
                  <span className="engine-badge yes">Claude ✓</span>
                  <span className="engine-badge yes">ChatGPT ✓</span>
                  <span className="engine-badge no">Gemini ✗</span>
                  <span className="engine-badge yes">Grok ✓</span>
                  <span className="engine-badge yes">Perplexity ✓</span>
                  <span className="engine-badge no">Copilot ✗</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

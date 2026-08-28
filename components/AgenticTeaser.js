import Link from "next/link";

// Condensed roadmap teaser (brief section 33) — deliberately NOT the full
// AisleProtect.js depth (no UCP/ACP/agent-identity language, no 5-card
// feature grid): "should NOT make today's product harder to understand...
// keep those on a dedicated page." AisleProtect.js on /why keeps its full
// treatment untouched; this just points there for anyone who wants it.
export default function AgenticTeaser() {
  return (
    <section className="agentic-teaser">
      <div className="wrap">
        <div className="aisle-head" style={{ justifyContent: "center", textAlign: "center" }}>
          <h2>
            Today AI recommends.
            <br />
            Tomorrow it may buy.
          </h2>
        </div>
        <p className="aisle-sub" style={{ margin: "12px auto 0", textAlign: "center", maxWidth: "54ch" }}>
          StockedBy is building toward visibility, trust and transaction intelligence for a world
          where AI agents don&apos;t just recommend brands. They buy from them.
        </p>
        <div className="steps">
          <div className="step">
            <span className="n">TODAY</span>
            <h3>AI visibility</h3>
            <p>See whether AI recommends your brand. Free, right now.</p>
          </div>
          <div className="step">
            <span className="n">NEXT</span>
            <h3>Continuous monitoring</h3>
            <p>Track your position and fix what&apos;s costing you recommendations.</p>
          </div>
          <div className="step">
            <span className="n">LATER</span>
            <h3>Agentic commerce trust</h3>
            <p>Identity and transaction intelligence for AI-driven checkout.</p>
          </div>
        </div>
        <Link href="/why#protect" className="agentic-teaser-link">
          Read more about what&rsquo;s next →
        </Link>
      </div>
    </section>
  );
}

import Link from "next/link";

export default function AisleProtect() {
  return (
    <section id="protect" className="wrap aisle">
      <div className="aisle-head rv">
        <span className="aisle-mark protect">Pillar · Protect</span>
        <h2>When agents start buying, trust becomes the product.</h2>
      </div>
      <p className="aisle-sub rv">
        Agentic checkout (UCP, ACP) means AI agents won&rsquo;t just recommend — they&rsquo;ll transact. That creates a new attack surface, and a new layer of infrastructure. We&rsquo;re building it.
      </p>
      <div className="aisle-plank rv" />
      <div className="grid">
        <div className="feat rv">
          <span className="flabel">Agent Readiness Audit</span>
          <h3>Can agents actually buy from you?</h3>
          <p>Free live check: robots.txt, /llms.txt, agentic-checkout manifests (UCP/ACP) and product structured data — scored Discoverable / Readable / Transactable.</p>
          <Link href="/audit" className="btn-ghost" style={{ display: "inline-block", marginTop: 12 }}>
            Run the agent audit
          </Link>
        </div>
        <div className="feat rv">
          <span className="flabel">Recommendation fraud<span className="soon">roadmap</span></span>
          <h3>Fake shelves, hijacked names</h3>
          <p>Counterfeit listings and impersonator domains riding your brand inside AI answers. We detect when the AI recommends &ldquo;you&rdquo; — but routes buyers somewhere that isn&rsquo;t you.</p>
        </div>
        <div className="feat rv">
          <span className="flabel">Agent identity &amp; trust<span className="soon">roadmap</span></span>
          <h3>Know which agents you&rsquo;re selling to</h3>
          <p>Verify legitimate shopping agents, flag scripted abuse, and decide which agentic traffic your store should trust and transact with.</p>
        </div>
        <div className="feat rv">
          <span className="flabel">Transaction risk<span className="soon">roadmap</span></span>
          <h3>Risk scoring for agentic checkout</h3>
          <p>When a purchase arrives via an AI agent instead of a human session, fraud looks different. Risk signals purpose-built for agent-initiated orders.</p>
        </div>
        <div className="feat rv">
          <span className="flabel">Brand watch<span className="soon">roadmap</span></span>
          <h3>Continuous protection, not point checks</h3>
          <p>Standing monitors on your brand across engines and markets — alerting you when your shelf position, routing, or sentiment is attacked or shifts.</p>
        </div>
      </div>
      <div className="steps" style={{ marginTop: "36px" }}>
        <div className="step rv"><span className="n">TODAY</span><h3>Free shelf test &amp; agent audit</h3><p>Measure your AI visibility and your agent readiness in minutes. Both free forever — how brands discover the problem.</p></div>
        <div className="step rv"><span className="n">NEXT</span><h3>Monitoring &amp; GEO suite</h3><p>Monthly tracking, competitive intelligence, fix generation and Share of AI Voice for teams.</p></div>
        <div className="step rv"><span className="n">THEN</span><h3>Agentic commerce infrastructure</h3><p>Trust, identity and transaction risk for a world where AI agents do the buying.</p></div>
      </div>
    </section>
  );
}

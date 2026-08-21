export default function AisleMonitor() {
  return (
    <section id="monitor" className="wrap aisle">
      <div className="aisle-head rv">
        <span className="aisle-mark">Pillar · Measure</span>
        <h2>See every shelf you&rsquo;re on. And every one you&rsquo;re not.</h2>
      </div>
      <p className="aisle-sub rv">
        One test, three AI engines, scored against the marketplace giant that actually matters in your market.
      </p>
      <div className="aisle-plank rv" />
      <div className="grid">
        <div className="feat rv">
          <span className="flabel">Multi-engine shelf test</span>
          <h3>Three AI shelves, one verdict</h3>
          <p>Real shopper questions run on Claude live and compared against ChatGPT and Gemini. A brand that wins on one engine and vanishes on another finds out here.</p>
        </div>
        <div className="feat rv">
          <span className="flabel">Share of AI voice</span>
          <h3>Your slice of every answer</h3>
          <p>Of all the recommendation slots AI hands out in your category, how many are yours?</p>
          <div className="mini-sov" role="img" aria-label="Sample share of voice: you 20%, marketplaces 33%, others 47%">
            <div style={{ width: "20%", background: "var(--tag)" }} />
            <div style={{ width: "33%", background: "var(--brick2)" }} />
            <div style={{ width: "47%", background: "var(--chip-bg)" }} />
          </div>
          <div className="mini-legend">
            <i style={{ color: "var(--link-hover)" }}>■ you</i>
            <i style={{ color: "var(--brick)" }}>■ marketplaces</i>
            <i style={{ color: "var(--muted)" }}>■ everyone else</i>
          </div>
        </div>
        <div className="feat rv">
          <span className="flabel">Local rival benchmark</span>
          <h3>Not just Amazon</h3>
          <p>India scores you against Flipkart. UAE and Saudi Arabia against Noon. Because that&rsquo;s who&rsquo;s actually eating your shelf.</p>
        </div>
        <div className="feat rv">
          <span className="flabel">Standardized scoring</span>
          <h3>Comparable, not vibes</h3>
          <p>Every brand in a category is tested on the same question set — so your score means something, and category leaderboards become possible.</p>
        </div>
      </div>
    </section>
  );
}

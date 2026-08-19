export default function AisleDiagnose() {
  return (
    <section id="diagnose" className="wrap aisle">
      <div className="aisle-head rv">
        <span className="aisle-mark diag">Pillar · Measure / Diagnose</span>
        <h2>Know exactly why you&rsquo;re losing — and to whom.</h2>
      </div>
      <p className="aisle-sub rv">
        Real telemetry from the AI&rsquo;s own process. Not estimates — the actual searches it ran and sources it trusted.
      </p>
      <div className="aisle-plank rv" />
      <div className="grid">
        <div className="feat rv">
          <span className="flabel">The checkout battle</span>
          <h3>Win the mention, lose the sale?</h3>
          <p>For every recommendation we record where the AI sends the buyer: your store, or a marketplace listing of you — where you pay commission and rent your own customer.</p>
          <div className="mini-sov" role="img" aria-label="Sample checkout routing: brand-direct 25%, marketplace 55%, aggregator 20%">
            <div style={{ width: "25%", background: "var(--green2)" }} />
            <div style={{ width: "55%", background: "var(--brick2)" }} />
            <div style={{ width: "20%", background: "#4A9FD8" }} />
          </div>
          <div className="mini-legend">
            <i style={{ color: "var(--green)" }}>■ brand-direct</i>
            <i style={{ color: "var(--brick)" }}>■ marketplace</i>
            <i style={{ color: "#4A9FD8" }}>■ aggregator</i>
          </div>
        </div>
        <div className="feat rv">
          <span className="flabel">Brand sentiment</span>
          <h3>How AI describes you</h3>
          <p>We analyze the exact language AI uses about your brand and hand you the label it&rsquo;s silently attached to you.</p>
          <span className="quote-chip">&ldquo;the budget option&rdquo;</span>
        </div>
        <div className="feat rv">
          <span className="flabel">Query fanout</span>
          <h3>The searches behind the answer</h3>
          <p>The literal web searches the AI ran before recommending. Rank for these and you&rsquo;re inside the answer.</p>
          <div className="mini-fan">
            <div>best polarized sunglasses under AED 200</div>
            <div>sunglasses brands UAE review 2026</div>
          </div>
        </div>
        <div className="feat rv">
          <span className="flabel">Trusted sources</span>
          <h3>The sites that decide the shelf</h3>
          <p>The domains that fed the AI&rsquo;s answer, ranked. Getting reviewed there matters more than your own homepage. It&rsquo;s your PR target list.</p>
        </div>
      </div>
    </section>
  );
}

// Short, mostly-whitespace section (brief section 24/38 — "some sections
// should feel almost empty"). Static illustration only — no GSAP, no
// animated chart, per this pass's motion decision.
export default function ImprovementLoop() {
  return (
    <section className="loop">
      <div className="wrap">
        <div className="aisle-head rv" style={{ justifyContent: "center", textAlign: "center" }}>
          <h2 style={{ margin: "0 auto" }}>Check. Understand. Fix. Recheck.</h2>
        </div>
        <p className="aisle-sub rv" style={{ margin: "12px auto 0", textAlign: "center" }}>
          AI answers change. One test is a snapshot, not a certificate.
        </p>
        <div className="loop-steps rv">
          <b>Check</b>
          <span className="loop-arrow">→</span>
          <b>Understand</b>
          <span className="loop-arrow">→</span>
          <b>Fix</b>
          <span className="loop-arrow">→</span>
          <b>Recheck</b>
        </div>
        <div className="loop-rank rv">
          <span>#4</span>
          <span className="loop-arrow2">→</span>
          <span>#3</span>
          <span className="loop-arrow2">→</span>
          <b>#1</b>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";

// Closing band (brief section 11 item 11) — one restated question, one
// primary action, one reassurance line. Reuses .receipt's existing card
// treatment (already used by the /why-era CTA) rather than inventing a
// second closing-card visual language.
export default function FinalCTA() {
  return (
    <section className="final-cta">
      <div className="wrap">
        <div className="receipt">
          <h2>Ask AI about your category.</h2>
          <p className="r-sub">See if it says your name, or your competitor&rsquo;s.</p>
          <Link href="/test" className="btn-primary" style={{ display: "block", textAlign: "center" }}>
            Check my brand — free
          </Link>
          <p className="r-fine">Free test. No card required.</p>
        </div>
      </div>
    </section>
  );
}

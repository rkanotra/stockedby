export default function Compare() {
  return (
    <section id="compare" className="wrap aisle">
      <div className="aisle-head rv"><h2>Why not the US tools?</h2></div>
      <p className="aisle-sub rv">They&rsquo;re good at what they do. What they do isn&rsquo;t your market.</p>
      <div className="cmp-scroll rv">
        <table className="cmp">
          <thead>
            <tr><th></th><th className="us">StockedBy</th><th>Profound</th><th>Otterly</th><th>HubSpot grader</th></tr>
          </thead>
          <tbody>
            <tr><td>Local marketplace rivals (Flipkart, Noon)</td><td className="us yes-mark">✓</td><td className="no-mark">✗</td><td className="no-mark">✗</td><td className="no-mark">✗</td></tr>
            <tr><td>Local-language queries (Hinglish, Arabic)</td><td className="us yes-mark">✓</td><td className="no-mark">✗</td><td className="no-mark">✗</td><td className="no-mark">✗</td></tr>
            <tr><td>Checkout routing (brand-direct vs marketplace)</td><td className="us yes-mark">✓</td><td className="no-mark">✗</td><td className="no-mark">✗</td><td className="no-mark">✗</td></tr>
            <tr><td>Query fanout &amp; trusted sources</td><td className="us yes-mark">✓</td><td className="yes-mark">✓</td><td className="no-mark">✗</td><td className="no-mark">✗</td></tr>
            <tr><td>Fix generation (JSON-LD, llms.txt)</td><td className="us yes-mark">✓</td><td className="no-mark">✗</td><td className="no-mark">✗</td><td className="no-mark">✗</td></tr>
            <tr><td>Free for merchants</td><td className="us yes-mark">✓</td><td className="no-mark">enterprise $</td><td className="no-mark">from $29/mo</td><td className="yes-mark">✓</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

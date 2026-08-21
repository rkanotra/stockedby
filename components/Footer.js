export default function Footer() {
  return (
    <footer>
      <div className="foot wrap">
        <div>
          <a className="logo" href="#top" style={{ fontSize: "16px" }}>
            stocked<b>by</b>
          </a>
          <br />
          <span style={{ fontSize: "12px" }}>
            The visibility, intelligence and trust layer for AI-driven commerce — starting with the merchants of India, UAE &amp; Saudi Arabia.
          </span>
        </div>
        <div>
          <a href="#monitor">Measure</a> · <a href="#win">Improve</a> · <a href="#protect">Protect</a>
          <br />
          <a href="#markets">Markets</a> · <a href="#data">Data</a> · <a href="#compare">Compare</a>
        </div>
        <div className="mono" style={{ fontSize: "11px" }}>
          Engines: ChatGPT · Gemini · Claude
          <br />© 2026 StockedBy
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";

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
            Every AI assistant is a shop now — StockedBy tells you if you&rsquo;re stocked by
            ChatGPT, Gemini and Claude.
          </span>
        </div>
        <div>
          <Link href="/test">Check my brand</Link> · <Link href="/audit">Free agent check</Link>
        </div>
        <div className="mono" style={{ fontSize: "11px" }}>
          © 2026 StockedBy
        </div>
      </div>
    </footer>
  );
}

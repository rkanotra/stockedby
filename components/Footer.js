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
            Every AI app is a shop now. StockedBy tells you if you&rsquo;re stocked.
          </span>
        </div>
        <div className="mono" style={{ fontSize: "11px" }}>
          <Link href="/privacy">Privacy</Link>
          <br />© 2026 StockedBy
        </div>
      </div>
    </footer>
  );
}

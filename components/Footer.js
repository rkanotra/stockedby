import Link from "next/link";

export default function Footer() {
  return (
    <footer>
      <div className="foot wrap">
        <div>
          <Link className="logo" href="/" style={{ fontSize: "16px" }}>
            stocked<b>by</b>
          </Link>
          <br />
          <span style={{ fontSize: "12px" }}>
            Every AI app is a shop now. StockedBy tells you if you&rsquo;re stocked.
          </span>
        </div>
        <div className="mono" style={{ fontSize: "11px" }}>
          <Link href="/how">How it works</Link> · <Link href="/why">Why StockedBy</Link> ·{" "}
          <Link href="/privacy">Privacy</Link>
          <br />© 2026 StockedBy
        </div>
      </div>
    </footer>
  );
}

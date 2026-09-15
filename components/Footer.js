import Link from "next/link";
import Brand from "./home/Brand";

export default function Footer() {
  return (
    <footer>
      <div className="foot wrap">
        <div>
          <Brand />
          <br />
          <span style={{ fontSize: "12px" }}>
            Every AI app is a shop now. StockedBy tells you if you&rsquo;re stocked.
          </span>
        </div>
        <div className="mono" style={{ fontSize: "11px" }}>
          <Link href="/how">How it works</Link> · <Link href="/why">Why StockedBy</Link> ·{" "}
          <Link href="/blog">Blog</Link> · <Link href="/privacy">Privacy</Link>
          <br />© 2026 StockedBy
        </div>
      </div>
    </footer>
  );
}

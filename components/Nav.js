import Link from "next/link";

// logo, How it works (/how), Why StockedBy (/why), Blog (/blog), Agent
// check (/audit), then the "Check my brand" CTA — the only button. Fits
// without crowding at the widths that matter (verified at 1024px+); links
// hide below 760px (globals.css @media on .nav-links) so mobile keeps the
// same minimal logo+button nav as before.
export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-in">
        <Link href="/" className="logo">
          stocked<b>by</b>
        </Link>
        <div className="nav-links">
          <Link href="/how">How it works</Link>
          <Link href="/why">Why StockedBy</Link>
          <Link href="/blog">Blog</Link>
          <Link href="/audit">Agent check</Link>
        </div>
        <Link href="/test" className="btn">Check my brand — free</Link>
      </div>
    </nav>
  );
}

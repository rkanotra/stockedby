import Link from "next/link";

// Four items max, in order: logo, How it works (/how), Why StockedBy
// (/why), Agent check (/audit), then the "Check my brand" CTA — the only
// button. Links hide below 760px (globals.css @media on .nav-links) so
// mobile keeps the same minimal logo+button nav as before; desktop
// visitors get the fuller nav into the two education pages.
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
          <Link href="/audit">Agent check</Link>
        </div>
        <Link href="/test" className="btn">Check my brand — free</Link>
      </div>
    </nav>
  );
}

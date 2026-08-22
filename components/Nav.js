import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-in">
        <a href="#top" className="logo">
          stocked<b>by</b>
        </a>
        <div className="nav-links">
          <Link href="/audit">Free agent check</Link>
        </div>
        <Link href="/test" className="btn">Check my brand</Link>
      </div>
    </nav>
  );
}

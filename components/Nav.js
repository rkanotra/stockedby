import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-in">
        <a href="#top" className="logo">
          stocked<b>by</b>
        </a>
        <Link href="/test" className="btn">Check my brand — free</Link>
      </div>
    </nav>
  );
}

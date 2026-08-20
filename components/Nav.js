import Link from "next/link";

export default function Nav() {
  return (
    <nav className="nav">
      <div className="nav-in">
        <a href="#top" className="logo">
          stocked<b>by</b>
        </a>
        <div className="nav-links">
          <a href="#monitor">Features</a>
          <a href="#markets">Markets</a>
          <a href="#data">Data</a>
          <a href="#protect">Protect</a>
          <a href="#compare">Compare</a>
          <Link href="/audit">Agent Audit</Link>
        </div>
        <Link href="/test" className="btn">Run free shelf test</Link>
      </div>
    </nav>
  );
}

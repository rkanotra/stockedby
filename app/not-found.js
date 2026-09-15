import Link from "next/link";
import PageShell from "@/components/site/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <section className="page-hero" style={{ paddingBottom: 100 }}>
        <span className="page-kicker">404 · OFF THE SHELF</span>
        <h1>We couldn’t find<br />that page.</h1>
        <p>The link may have changed. Head home, or start a fresh check to see where your brand stands.</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 30 }}>
          <Link href="/" className="btn-ghost">Back to home</Link>
          <Link href="/test" className="btn-ghost">Check my brand ↗</Link>
        </div>
      </section>
    </PageShell>
  );
}

import Link from "next/link";

// TODO: no real /report/[slug] exists yet for a Minimalist example (Hero's
// report-card demo is static mock data from data/india.json, never actually
// run through /api/test — and Supabase's `reports` table is still empty
// until supabase/migrations/0001_phase4_schema.sql is applied). Once a real
// test has been run and saved, drop its slug in here to activate the link;
// until then it stays hidden rather than pointing at a page that 404s. The
// link already carries ?full=1 so the moment this is set, it opens the
// report with the full details expanded (app/report/[slug]/page.js reads
// that param into ReportView's initialShowFull) — a visitor sees the depth
// immediately instead of needing to click "See full report" themselves.
const EXAMPLE_REPORT_SLUG = "";

const PROMISES = [
  {
    line: "See who AI recommends — you or your rival",
    icon: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" />
      </>
    ),
  },
  {
    line: "See where AI sends buyers to pay",
    icon: (
      <>
        <path d="M6 8h12l-1.2 11.2a1 1 0 0 1-1 .8H8.2a1 1 0 0 1-1-.8L6 8z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
  },
  {
    line: "Get simple steps to fix it",
    icon: (
      <>
        <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.8 2.8-3-3 2.8-2.8z" />
      </>
    ),
  },
];

export default function PromiseStrip() {
  return (
    <section className="promises">
      <div className="wrap">
        <ul className="promise-list">
          {PROMISES.map((p) => (
            <li key={p.line} className="promise-line">
              <svg className="promise-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {p.icon}
              </svg>
              <span>{p.line}</span>
            </li>
          ))}
        </ul>
        {EXAMPLE_REPORT_SLUG && (
          <a href={`/report/${EXAMPLE_REPORT_SLUG}?full=1`} className="promise-link">
            See a real report →
          </a>
        )}
        <Link href="/audit" className="audit-promo-card">
          <span className="audit-promo-label">For technical teams</span>
          <h3 className="audit-promo-title">Agent-ready check</h3>
          <p className="audit-promo-line">
            As agentic commerce arrives (ChatGPT checkout, Google UCP), can AI agents read and
            buy from your store? Free 30-second audit.
          </p>
          <span className="audit-promo-btn">Run agent check</span>
        </Link>
      </div>
    </section>
  );
}

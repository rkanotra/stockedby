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

// Three questions StockedBy actually answers — editorial numbering, not
// three identical icon cards. This is the product, not a feature list.
const QUESTIONS = [
  { n: "01", title: "Do I show up?", line: "Whether ChatGPT, Gemini and Claude recommend your brand." },
  { n: "02", title: "Who gets picked instead?", line: "Which competitors and marketplaces get the recommendation." },
  { n: "03", title: "What should I fix?", line: "The three things most likely to change the answer." },
];

export default function PromiseStrip() {
  return (
    <section className="promises">
      <div className="wrap">
        <div className="aisle-head" style={{ justifyContent: "center", textAlign: "center" }}>
          <h2 style={{ margin: "0 auto" }}>What StockedBy tells you</h2>
        </div>
        <ol className="q-list">
          {QUESTIONS.map((q) => (
            <li key={q.n} className="q-item">
              <span className="q-num">{q.n}</span>
              <div>
                <div className="q-title">{q.title}</div>
                <p className="q-line">{q.line}</p>
              </div>
            </li>
          ))}
        </ol>
        {EXAMPLE_REPORT_SLUG && (
          <a href={`/report/${EXAMPLE_REPORT_SLUG}?full=1`} className="promise-link">
            See a real report →
          </a>
        )}
        <Link href="/audit" className="audit-promo-card rv">
          <span className="audit-promo-label">For technical teams</span>
          <h3 className="audit-promo-title">Agent-ready check</h3>
          <p className="audit-promo-line">Can an AI agent actually read your site and buy from it? Free 30-second check.</p>
          <span className="audit-promo-btn">Run agent check</span>
        </Link>
      </div>
    </section>
  );
}

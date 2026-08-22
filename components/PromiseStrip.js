// TODO: no real /report/[slug] exists yet for a Minimalist example (Hero's
// report-card demo is static mock data from data/india.json, never actually
// run through /api/test — and Supabase's `reports` table is still empty
// until supabase/migrations/0001_phase4_schema.sql is applied). Once a real
// test has been run and saved, drop its slug in here to activate the link;
// until then it stays hidden rather than pointing at a page that 404s.
const EXAMPLE_REPORT_SLUG = "";

const PROMISES = [
  "See which AI apps recommend you.",
  "See where they send buyers to pay.",
  "Get simple steps to fix what's missing.",
];

export default function PromiseStrip() {
  return (
    <section className="promises">
      <div className="wrap">
        <ul className="promise-list">
          {PROMISES.map((line) => (
            <li key={line} className="promise-line">
              {line}
            </li>
          ))}
        </ul>
        {EXAMPLE_REPORT_SLUG && (
          <a href={`/report/${EXAMPLE_REPORT_SLUG}`} className="promise-link">
            See a real report →
          </a>
        )}
      </div>
    </section>
  );
}

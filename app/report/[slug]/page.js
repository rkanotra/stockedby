import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReportBySlug } from "@/lib/reports";
import { buildFounderSummary } from "@/lib/scoring";
import ReportView from "@/components/test/report/ReportView";
import styles from "@/components/test/test.module.css";

export const runtime = "nodejs";

// Read-only, persisted view of a completed test (app/api/test/route.js
// saves one of these for every completed test — see lib/reports.js). The
// same ReportView/LeadGate the live /test flow uses render here too: the
// gate is a client-side presentational layer, not server-side redaction,
// so a shared link still asks a NEW visitor for their own email before
// showing the deep sections — see LeadGate.js's own comment.
//
// React cache() (not just Next's fetch dedup — the Supabase client doesn't
// necessarily route through Next's patched global fetch in a way that gets
// deduped automatically) so generateMetadata and the page body share one
// Supabase round-trip per request, not two — "keep Supabase usage lean."
const loadReport = cache(async (slug) => getReportBySlug(slug));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const row = await loadReport(slug);
  if (!row) {
    return { title: "Report not found — StockedBy" };
  }
  const data = row.report_json || {};
  const verdict = data.report?.verdict || "";
  const description = data.report
    ? buildFounderSummary({
        brand: data.brand,
        category: data.category?.name,
        appearanceSummary: data.report.appearanceSummary,
        yourDestinations: data.report.destinations?.yourDestinations || [],
      })
    : `${data.brand}'s AI shelf test results on StockedBy.`;
  const title = `${data.brand} — ${verdict} · StockedBy`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function ReportPage({ params, searchParams }) {
  const { slug } = await params;
  const search = await searchParams;
  const row = await loadReport(slug);
  if (!row) notFound();

  const data = row.report_json || {};
  // ?full=1 (used by the homepage's "See a real report" example link) opens
  // straight on Layer 2 so a visitor sees the depth without an extra click.
  const initialShowFull = search?.full === "1";

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.topNav}>
          <Link href="/" className={styles.logo}>
            stocked<b>by</b>
          </Link>
        </div>
        <div className={styles.mark}>StockedBy · {data.market}</div>
        <h1 className={styles.title}>{data.brand}&rsquo;s AI shelf report</h1>
        <p className={styles.sub}>{data.category?.name}</p>

        <ReportView data={{ ...data, slug: row.slug }} initialShowFull={initialShowFull} />

        <Link
          href="/test"
          className={styles.btnGhost}
          style={{ display: "block", textAlign: "center", marginTop: 14 }}
        >
          Run your own free shelf test
        </Link>
      </div>
    </div>
  );
}

import { NextResponse } from "next/server";
import { buildReportPdf } from "@/lib/pdf/buildReportPdf";

export const runtime = "nodejs";
export const maxDuration = 20;

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Backs the report page's "Download PDF" button (components/test/report/
// StoryView.js) — the same lib/pdf/buildReportPdf.js the merchant email
// attaches, just regenerated on demand from the exact data ReportView.js
// already has in memory (live test flow or the shared /report/[slug]
// page) rather than persisted anywhere: there's no file storage layer in
// this app, and re-rendering a text/table PDF from data already in hand is
// cheap enough that persistence would be pure overhead.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const { brand, category, market, competitor, brandWebsite, report, engines, sentiment, mentionCount, trustedSources, reportUrl } =
    body || {};

  const brandInput = typeof brand === "string" ? brand.trim() : "";
  if (!brandInput || !report || !engines) {
    return badRequest("Missing report data.");
  }

  try {
    const pdfBuffer = await buildReportPdf({
      brand: brandInput,
      categoryName: typeof category === "string" ? category : "",
      market: typeof market === "string" ? market : "",
      competitor: typeof competitor === "string" ? competitor : null,
      brandWebsite: typeof brandWebsite === "string" ? brandWebsite : "",
      report,
      engines,
      sentiment,
      mentionCount: typeof mentionCount === "number" ? mentionCount : undefined,
      trustedSources,
      reportUrl: typeof reportUrl === "string" ? reportUrl : null,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="stockedby-ai-visibility-report.pdf"`,
      },
    });
  } catch (e) {
    console.error("[report-pdf] generation failed", e?.message || e);
    return NextResponse.json({ error: "Couldn't generate the PDF. Please try again." }, { status: 500 });
  }
}

"use client";

import { useState } from "react";
import styles from "../test.module.css";
import { trackEvent } from "@/lib/analytics";

// Same lib/pdf/buildReportPdf.js the merchant email attaches, regenerated
// on demand. Lives at the bottom of the expanded full report (Layer 2) —
// see ReportView.js — so by the time this is reachable, showFull is
// always true; `fullReportExpanded` distinguishes WHY it's true (the
// merchant clicked "See full report" themselves this session, vs. landed
// already-expanded via a shared /report/[slug]?full=1 link) for the GA4
// event, since "was it expanded" is otherwise a constant, not a signal.
export default function DownloadPdfButton({
  brand,
  categoryName,
  market,
  competitor,
  brandWebsite,
  report,
  engines,
  sentiment,
  mentionCount,
  trustedSources,
  slug,
  fullReportExpanded,
}) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download() {
    setDownloading(true);
    setError("");
    try {
      const res = await fetch("/api/report-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand,
          category: categoryName,
          market,
          competitor,
          brandWebsite,
          report,
          engines,
          sentiment,
          mentionCount,
          trustedSources,
          reportUrl: slug ? `${window.location.origin}/report/${slug}` : null,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stockedby-ai-visibility-report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      trackEvent("pdf_downloaded", { full_report_expanded: Boolean(fullReportExpanded) });
    } catch {
      setError("Couldn't generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      {error && <div className={styles.errBanner}>{error}</div>}
      <button type="button" className={styles.btnGhost} onClick={download} disabled={downloading}>
        {downloading ? "Preparing PDF…" : "Download PDF report"}
      </button>
    </>
  );
}

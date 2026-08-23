"use client";

import { useState } from "react";
import styles from "../test.module.css";

// Same lib/pdf/buildReportPdf.js the merchant email attaches, regenerated
// on demand — ungated (Layer 1), since the PDF's content is the same
// substance the free email already delivers.
export default function DownloadPdfButton({ brand, categoryName, market, brandWebsite, report, engines, sentiment, trustedSources, slug }) {
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
          brandWebsite,
          report,
          engines,
          sentiment,
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

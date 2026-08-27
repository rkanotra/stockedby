"use client";

import Link from "next/link";
import styles from "../test.module.css";

// Closing summary + the two CTAs the founder-first redesign loop expects:
// primary into /fix (removing the technical blockers behind the gap this
// report just found), secondary into a fresh /test. Works identically
// from the live wizard (TestFlow.js) and the shared /report/[slug] page —
// both just need brand/brandWebsite, no callback into wizard state.
export default function NextMoveCTA({ brand, biggestOpportunity, brandWebsite }) {
  const fixHref = brandWebsite ? `/fix?domain=${encodeURIComponent(brandWebsite)}` : "/fix";
  return (
    <div className={styles.card}>
      <div className={styles.h2}>Your next move</div>
      <p className={styles.sectionHint} style={{ marginBottom: 14 }}>
        {biggestOpportunity
          ? `${brand} has AI awareness, but ${biggestOpportunity.stageLabel.toLowerCase()} visibility is weak. ${biggestOpportunity.detail}`
          : `${brand} is showing up well in AI recommendations — keep testing monthly to stay ahead.`}
      </p>
      <Link href={fixHref} className={styles.btn} style={{ display: "block", textAlign: "center" }}>
        Improve my AI visibility →
      </Link>
      <Link href="/test" className={styles.btnGhost} style={{ display: "block", textAlign: "center" }}>
        Run another test
      </Link>
    </div>
  );
}

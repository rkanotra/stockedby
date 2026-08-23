"use client";

import Link from "next/link";
import styles from "../test.module.css";

// Cross-sell CTA for multi-category brands — ungated (Layer 1, StoryView.js)
// since it doesn't need any deep report data, just what's already known
// from setup. domain+brand+market ride along in the URL so TestFlow.js can
// skip straight to the category step for a returning merchant instead of
// re-asking what it already knows (see TestFlow.js's returnContextFromParams).
export default function TestAnotherCTA({ categoryName, brand, brandWebsite, market }) {
  const params = new URLSearchParams();
  if (brandWebsite) params.set("domain", brandWebsite);
  if (brand) params.set("brand", brand);
  if (market) params.set("market", market);
  const href = params.toString() ? `/test?${params.toString()}` : "/test";

  return (
    <div className={styles.card}>
      <div className={styles.h2}>Sell more than {categoryName}?</div>
      <p className={styles.sectionHint} style={{ marginBottom: 14 }}>
        You can test another product right after — each gets its own report.
      </p>
      <Link href={href} className={styles.btn} style={{ display: "block", textAlign: "center" }}>
        Test your next product →
      </Link>
    </div>
  );
}

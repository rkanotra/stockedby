"use client";

import styles from "../test/test.module.css";

// "Stocked.by found the problem and already prepared the solution" —
// shown BEFORE any code (CLAUDE.md's redesign phase). Up to 3 items:
// product data (real count, never implying 8 pages = the whole catalog),
// store summary (llms.txt, only when there's real content for it), and a
// constant, always-future-ready third item — agentic checkout is
// emerging infrastructure, not a current standard.
export default function FixPlan({ needsProductFix, totalProducts, hasLlmsTxt }) {
  return (
    <div className={styles.card}>
      <div className={styles.h2}>Your fix plan</div>
      {needsProductFix > 0 && (
        <div className={styles.impactBlock}>
          <span className={styles.impactBlockLabel}>1. Improve product information — fix first</span>
          <span className={styles.impactBlockText}>
            {needsProductFix} of {totalProducts} product page{totalProducts === 1 ? "" : "s"} we checked need
            structured data improvement. Easy · ~10 min.
          </span>
        </div>
      )}
      {hasLlmsTxt && (
        <div className={styles.impactBlock}>
          <span className={styles.impactBlockLabel}>{needsProductFix > 0 ? "2." : "1."} Add a store summary — improve next</span>
          <span className={styles.impactBlockText}>Additional machine-readable context for your whole store. Easy · ~5 min.</span>
        </div>
      )}
      <div className={styles.impactBlock}>
        <span className={styles.impactBlockLabel}>
          {(needsProductFix > 0 ? 1 : 0) + (hasLlmsTxt ? 1 : 0) + 1}. Prepare AI checkout — future-ready
        </span>
        <span className={styles.impactBlockText}>Developer-recommended, once agentic checkout standards mature.</span>
      </div>
    </div>
  );
}

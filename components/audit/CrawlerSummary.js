"use client";

import styles from "../test/test.module.css";

// Groups the 6 individual AI crawler checks (lib/audit/robots.js's
// AI_BOTS) into 4 platform buckets a founder recognizes — never seven
// unlabeled bot rows by default (CLAUDE.md's redesign phase). Per-bot
// detail (exact User-Agent, robots rule) stays available in the Layer 2
// technical-detail disclosure, unchanged.
export default function CrawlerSummary({ summary }) {
  if (!summary || summary.restricted.length === 0) return null;
  return (
    <div className={styles.card}>
      <span className={styles.label}>AI access</span>
      <p className={styles.storyLine} style={{ marginTop: 0, marginBottom: 12 }}>
        {summary.restricted.length} major AI crawler rule{summary.restricted.length === 1 ? "" : "s"} need attention
      </p>
      <div className={styles.impactBlock}>
        <span className={styles.impactBlockLabel}>Restricted</span>
        <span className={styles.impactBlockText}>{summary.restricted.map((g) => g.platform).join(", ")}</span>
      </div>
      {summary.accessible.length > 0 && (
        <div className={styles.impactBlock}>
          <span className={styles.impactBlockLabel}>Accessible</span>
          <span className={styles.impactBlockText}>{summary.accessible.map((g) => g.platform).join(", ")}</span>
        </div>
      )}
    </div>
  );
}

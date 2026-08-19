"use client";

import styles from "./test.module.css";

// All queries fire in one parallel batch server-side (see app/api/test),
// so we can't stream true per-query timing — every dot goes to "searching"
// together, then flips to its real per-query done/error state from the
// response. Still reflects real outcomes, just coarser-grained timing.
export default function RunningPanel({ queries }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>Claude · live run</span>
      <p className={styles.runningNote}>
        Running {queries.length} question{queries.length === 1 ? "" : "s"} against Claude with
        live web search…
      </p>
      {queries.map((q, i) => (
        <div className={styles.queryline} key={q.qid || i}>
          <span className={`${styles.dot} ${styles.dotSearching}`} />
          <span style={{ flex: 1 }} dir="auto">{q.text}</span>
        </div>
      ))}
    </div>
  );
}

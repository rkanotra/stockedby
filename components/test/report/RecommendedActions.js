"use client";

import styles from "../test.module.css";

// Maximum 3 actions, first one visually dominant — every item traceable
// to a real signal (lib/founderReport.js's buildFounderActions()), never
// generic "improve SEO" filler.
export default function RecommendedActions({ actions }) {
  if (!actions || actions.length === 0) return null;
  return (
    <div className={styles.card}>
      <div className={styles.h2}>What should you do next?</div>
      {actions.map((a, i) => (
        <div key={i} className={`${styles.actionItem} ${i === 0 ? styles.actionItemPrimary : ""}`}>
          <span className={styles.actionImpact}>{a.impact}</span>
          <div className={styles.actionTitle}>
            {i + 1}. {a.title}
          </div>
          <p className={styles.actionDetail}>{a.detail}</p>
        </div>
      ))}
    </div>
  );
}

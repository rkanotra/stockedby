"use client";

import styles from "../test.module.css";

// Prominent, single opportunity callout — CLAUDE.md's redesign phase asks
// for exactly one, visually dominant "look here" moment, not a list.
// Renders nothing when lib/founderReport.js's buildBiggestOpportunity()
// couldn't find one (no buyer-journey data yet) — never a fabricated
// generic opportunity.
export default function BiggestOpportunityCard({ opportunity, onSeeFix }) {
  if (!opportunity) return null;
  return (
    <div className={styles.opportunityCard}>
      <span className={styles.opportunityLabel}>Your biggest opportunity</span>
      <div className={styles.opportunityTitle}>{opportunity.title}</div>
      <p className={styles.opportunityDetail}>{opportunity.detail}</p>
      <button type="button" className={styles.btn} onClick={onSeeFix}>
        See what to fix →
      </button>
    </div>
  );
}

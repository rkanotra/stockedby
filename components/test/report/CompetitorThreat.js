"use client";

import styles from "../test.module.css";

// "Who is winning instead?" — the single biggest competitor made visually
// dominant, smaller ones listed plainly underneath (no table). Built from
// lib/founderReport.js's buildCompetitorThreat(): recommendation
// frequency + average rank across every real question/engine — never
// picked off one response.
export default function CompetitorThreat({ competitorThreat }) {
  if (!competitorThreat) return null;
  const { label, appearedIn, totalQuestions, avgRank, others } = competitorThreat;
  return (
    <div className={styles.competitorCard}>
      <div className={styles.h2}>Who is winning instead?</div>
      <div className={styles.competitorName}>{label} is your biggest AI competitor.</div>
      <div className={styles.competitorStats}>
        <div className={styles.founderStat}>
          <span className={styles.founderStatValue}>
            {appearedIn} of {totalQuestions}
          </span>
          <span className={styles.founderStatLabel}>shopper questions</span>
        </div>
        {avgRank !== null && (
          <div className={styles.founderStat}>
            <span className={styles.founderStatValue}>#{avgRank}</span>
            <span className={styles.founderStatLabel}>average position</span>
          </div>
        )}
      </div>
      {others.length > 0 && (
        <div className={styles.competitorOthers}>
          {others.map((c) => (
            <div className={styles.competitorOtherRow} key={c.label}>
              <span>{c.label}</span>
              <span>
                {c.count} appearance{c.count === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import styles from "../test/test.module.css";

// "What we found / Why it matters / What to do" per finding, most severe
// first — lib/audit/layerOne.js's FINDING_RULES already computes `why`
// and `tier` alongside `finding`/`fix`, so this never invents a business
// consequence the check itself doesn't support.
export default function AuditFindings({ findings }) {
  if (!findings || findings.length === 0) return null;
  return (
    <div className={styles.card}>
      <span className={styles.label}>What&rsquo;s wrong</span>
      {findings.map((f, i) => (
        <div key={i} style={{ marginTop: i === 0 ? 0 : 18 }}>
          <div className={styles.storyLine} style={{ marginTop: 0, fontWeight: 700 }}>
            {f.finding}
          </div>
          <div className={styles.impactBlock}>
            <span className={styles.impactBlockLabel}>Why it matters</span>
            <span className={styles.impactBlockText}>{f.why}</span>
          </div>
          <div className={styles.impactBlock}>
            <span className={styles.impactBlockLabel}>What to do</span>
            <span className={styles.impactBlockText}>{f.fix}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

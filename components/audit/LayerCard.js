"use client";

import styles from "../test/test.module.css";

const ICON = { pass: "✓", warn: "!", fail: "✕", unknown: "?" };

// Layer 2 is de-emphasized developer detail — a passing score doesn't
// need to shout (hard rule 5): only a low score (needs attention) or a
// very low one (danger) get colour, mirroring .checkIcon's warn/fail
// treatment in test.module.css.
export default function LayerCard({ title, hint, layer }) {
  const { checks, score } = layer;
  const scoreColor =
    score === null
      ? "var(--text-muted)"
      : score >= 70
      ? "var(--text-primary)"
      : score >= 40
      ? "var(--accent)"
      : "var(--danger)";

  return (
    <div className={styles.card}>
      <div className={styles.layerHead}>
        <div className={styles.h2} style={{ marginBottom: 0 }}>
          {title}
        </div>
        <div className={styles.layerScore} style={{ color: scoreColor }}>
          {score === null ? "—" : `${score}/100`}
        </div>
      </div>
      <p className={styles.sectionHint}>{hint}</p>

      {checks.map((c) => (
        <div className={styles.checkRow} key={c.id}>
          <span className={`${styles.checkIcon} ${styles[c.status]}`}>{ICON[c.status]}</span>
          <div className={styles.checkBody}>
            <div className={styles.checkLabel}>{c.label}</div>
            <div className={styles.checkDetail} dir="auto">
              {c.detail}
            </div>
            {c.fix && <div className={styles.checkFix}>Fix: {c.fix}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

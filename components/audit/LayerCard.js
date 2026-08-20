"use client";

import styles from "../test/test.module.css";

const ICON = { pass: "✓", warn: "!", fail: "✕", unknown: "?" };

export default function LayerCard({ title, hint, layer }) {
  const { checks, score } = layer;
  const scoreColor = score === null ? "#9db4a6" : score >= 70 ? "#5bd6a0" : score >= 40 ? "#ffc53d" : "#ff6b57";

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

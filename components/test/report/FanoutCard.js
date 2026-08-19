"use client";

import styles from "../test.module.css";

export default function FanoutCard({ fanout }) {
  if (!fanout || fanout.length === 0) return null;
  return (
    <div className={styles.card}>
      <div className={styles.h2}>What Claude searched · live telemetry</div>
      {fanout.map((s, i) => (
        <div className={styles.fanout} key={i} dir="auto">
          {s}
        </div>
      ))}
    </div>
  );
}

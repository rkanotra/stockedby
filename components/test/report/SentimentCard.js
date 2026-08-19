"use client";

import styles from "../test.module.css";

const SENTI_COLOR = {
  positive: "#5bd6a0",
  negative: "#ff6b57",
  neutral: "#ffc53d",
};

export default function SentimentCard({ sentiment }) {
  if (!sentiment) return null;
  const color = SENTI_COLOR[sentiment.sentiment] || "#ffc53d";

  return (
    <div className={styles.card}>
      <div className={styles.h2}>How AI talks about you</div>
      <span className={styles.sentibadge} style={{ color }}>
        {sentiment.sentiment}
      </span>
      <div className={styles.positioning} style={{ color }}>
        “{sentiment.positioning}”
      </div>
      <p className={styles.sentisum}>{sentiment.summary}</p>
    </div>
  );
}

"use client";

import styles from "../test.module.css";

const SENTI_COLOR = {
  positive: "#5bd6a0",
  negative: "#ff6b57",
  neutral: "#ffc53d",
};

export default function SentimentCard({ sentiment, mentionCount }) {
  const color = sentiment ? SENTI_COLOR[sentiment.sentiment] || "#ffc53d" : null;

  return (
    <div className={styles.card}>
      <div className={styles.h2}>How AI talks about you</div>
      <p className={styles.sectionHint}>
        AI&rsquo;s own words when it explained why it recommended you — not our opinion.
      </p>
      {mentionCount < 2 ? (
        <p className={styles.sentisum}>Not enough mentions yet to analyze how AI describes you.</p>
      ) : sentiment ? (
        <>
          <span className={styles.sentibadge} style={{ color }}>
            {sentiment.sentiment}
          </span>
          <div className={styles.positioning} style={{ color }}>
            “{sentiment.positioning}”
          </div>
          <p className={styles.sentisum}>{sentiment.summary}</p>
        </>
      ) : (
        <p className={styles.sentisum}>Couldn&rsquo;t analyze sentiment this time — try again.</p>
      )}
    </div>
  );
}

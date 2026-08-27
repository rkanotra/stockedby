"use client";

import styles from "../test.module.css";

// Verdict colours (hard rule 5): positive/negative/neutral all get the
// same plain treatment — the word carries the meaning, not a green/red/
// amber badge (a wall of colour reads as an alarm, not an analysis, on a
// report that gets screenshotted and forwarded).
export default function SentimentCard({ sentiment, mentionCount }) {
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
          <span className={styles.sentibadge}>{sentiment.sentiment}</span>
          <div className={styles.positioning}>“{sentiment.positioning}”</div>
          <p className={styles.sentisum}>{sentiment.summary}</p>
        </>
      ) : (
        <p className={styles.sentisum}>Couldn&rsquo;t analyze sentiment this time — try again.</p>
      )}
    </div>
  );
}

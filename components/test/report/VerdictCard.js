"use client";

import styles from "../test.module.css";
import { ENGINE_LABELS, RIVAL_LABELS, buildFounderSummary, couldChangeVerdict } from "@/lib/scoring";

const VERDICT_CLASS = {
  "NOT STOCKED": "vBad",
  "BARELY STOCKED": "vMid",
  OUTSHELVED: "vMid",
  "ON THE SHELF": "vGood",
};

// Partial-failure handling: no red dashed error box, ever — a failed
// question that couldn't have changed the verdict (lib/scoring.js's
// couldChangeVerdict) shows nothing beyond the honest count; one that
// could shows one quiet grey line, no border, no box. 2+ failures means
// the verdict, founder summary and per-engine scores are ALL withheld —
// every one of them is computed from the same incomplete data, so showing
// any of them would be misleading, not just the verdict itself.
export default function VerdictCard({ market, brand, category, report, onRetry }) {
  const rivalLabel = RIVAL_LABELS[market] || "Amazon";
  const appearance = report.appearanceSummary;
  const failed = appearance?.failed || 0;
  const tooIncomplete = failed >= 2;

  const founderSummary = buildFounderSummary({
    brand,
    category,
    appearanceSummary: appearance,
    yourDestinations: report.destinations.yourDestinations,
  });

  if (tooIncomplete) {
    return (
      <div className={styles.card}>
        <div className={styles.incompleteNotice}>Couldn&rsquo;t complete this check — try again</div>
        {onRetry && (
          <button
            type="button"
            className={styles.retryHintBtn}
            style={{ marginTop: 8 }}
            onClick={() => onRetry(appearance.failedQueries)}
          >
            Retry →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <p className={styles.sentisum} style={{ marginBottom: 14 }}>
        {founderSummary}
      </p>

      <div className={`${styles.verdict} ${styles[VERDICT_CLASS[report.verdict]] || ""}`}>{report.verdict}</div>
      {appearance && (
        <div className={styles.subline}>
          Recommended in {appearance.appearedIn} of {appearance.totalAttempted} question
          {appearance.totalAttempted === 1 ? "" : "s"}
          {appearance.bestRank ? `, best rank #${appearance.bestRank}` : ""}.
        </div>
      )}

      {appearance && failed === 1 && couldChangeVerdict(appearance) && onRetry && (
        <div className={styles.retryHint}>
          One question didn&rsquo;t complete.{" "}
          <button type="button" className={styles.retryHintBtn} onClick={() => onRetry(appearance.failedQueries)}>
            Retry →
          </button>
        </div>
      )}

      <div className={styles.engines}>
        {report.engineScores.map((s) => (
          <div className={styles.enginebox} key={s.engine}>
            <div className={styles.nm}>
              {ENGINE_LABELS[s.engine]}
              {s.engine === "claude" ? " · live" : ""}
            </div>
            {s.you === null ? (
              <div className={styles.vs} style={{ marginTop: 6 }}>
                data coming soon
              </div>
            ) : (
              <>
                <div className={styles.sc}>{s.you}</div>
                <div className={styles.vs}>
                  {rivalLabel}: {s.rival}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

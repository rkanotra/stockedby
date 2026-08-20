"use client";

import styles from "../test.module.css";
import { ENGINE_LABELS, RIVAL_LABELS, buildFounderSummary } from "@/lib/scoring";

const VERDICT_CLASS = {
  "NOT STOCKED": "vBad",
  "BARELY STOCKED": "vMid",
  OUTSHELVED: "vMid",
  "ON THE SHELF": "vGood",
};

export default function VerdictCard({ market, brand, category, report, onRetry }) {
  const rivalLabel = RIVAL_LABELS[market] || "Amazon";
  const appearance = report.appearanceSummary;
  const founderSummary = buildFounderSummary({
    brand,
    category,
    appearanceSummary: appearance,
    yourDestinations: report.destinations.yourDestinations,
  });

  return (
    <div className={styles.card}>
      <p className={styles.sentisum} style={{ marginBottom: 14 }}>
        {founderSummary}
      </p>

      <div className={`${styles.verdict} ${styles[VERDICT_CLASS[report.verdict]] || ""}`}>{report.verdict}</div>
      {appearance && (
        <div className={styles.subline}>
          Recommended in {appearance.appearedIn} of {appearance.totalAttempted} organic question
          {appearance.totalAttempted === 1 ? "" : "s"}
          {appearance.bestRank ? `, best rank #${appearance.bestRank}` : ""}.
        </div>
      )}

      {appearance && appearance.failed > 0 && (
        <div className={styles.retryRow}>
          <span>
            {appearance.failed} question{appearance.failed === 1 ? "" : "s"} couldn&rsquo;t complete
          </span>
          {onRetry && (
            <button type="button" className={styles.retryBtn} onClick={onRetry}>
              Retry
            </button>
          )}
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

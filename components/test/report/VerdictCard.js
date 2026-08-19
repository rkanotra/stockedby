"use client";

import styles from "../test.module.css";
import { ENGINE_LABELS, RIVAL_LABELS } from "@/lib/scoring";

const VERDICT_CLASS = {
  "NOT STOCKED": "vBad",
  OUTSHELVED: "vMid",
  "ON THE SHELF": "vGood",
};

export default function VerdictCard({ market, brand, report }) {
  const rivalLabel = RIVAL_LABELS[market] || "Amazon";
  return (
    <div className={styles.card}>
      <div className={`${styles.verdict} ${styles[VERDICT_CLASS[report.verdict]] || ""}`}>{report.verdict}</div>
      <div className={styles.subline}>
        {brand} appeared in {report.appearRows} of {report.totalRows} AI shopping answers across{" "}
        {report.scoredEngineCount} engine{report.scoredEngineCount === 1 ? "" : "s"} with data.
      </div>
      <div className={styles.engines}>
        {report.engineScores.map((s) => (
          <div className={styles.enginebox} key={s.engine}>
            <div className={styles.nm}>
              {ENGINE_LABELS[s.engine]}
              {s.engine === "claude" ? " · live" : ""}
            </div>
            {s.you === null ? (
              <div className={styles.vs} style={{ marginTop: 6 }}>
                harvest in progress
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

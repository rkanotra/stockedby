"use client";

import styles from "../test.module.css";

const STAGE_CLASS = { Weak: "weak", Growing: "growing", Strong: "strongStage" };

function stageDetail(stage) {
  if (stage.pct === null) return "Not enough questions of this type yet.";
  if (stage.key === "discover") {
    return stage.pct === 0
      ? "AI recommends competitors before shoppers know your brand."
      : "AI mentions you when shoppers ask what to buy.";
  }
  if (stage.key === "consider") {
    return stage.pct === 0
      ? "Your brand doesn't show up when shoppers compare options."
      : "Your brand appears in some shortlists.";
  }
  return stage.pct === 0
    ? "AI doesn't yet know where shoppers can buy from you."
    : "AI knows where shoppers can purchase your products.";
}

// The signature Stocked.by visual (CLAUDE.md's redesign phase) — Discover
// -> Consider -> Buy, built from lib/founderReport.js's buildBuyerJourney()
// (real per-archetype appearance rates). A stage with no data shows a
// status word only, never a fabricated percentage.
export default function BuyerJourney({ buyerJourney }) {
  const { stages, insight } = buyerJourney;
  return (
    <div>
      <div className={styles.h2}>AI Buyer Journey</div>
      <div className={styles.journey}>
        {stages.map((s) => {
          const stageClass = s.band ? styles[STAGE_CLASS[s.band]] : "";
          return (
            <div key={s.key} className={`${styles.journeyStage} ${stageClass}`}>
              <span className={styles.journeyStageLabel}>{s.label}</span>
              {s.pct !== null && <span className={styles.journeyStagePct}>{s.pct}%</span>}
              <span className={`${styles.journeyStageStatus} ${s.band ? stageClass : styles.notchecked}`}>
                {s.band || "No data yet"}
              </span>
              <p className={styles.journeyStageDetail}>{stageDetail(s)}</p>
            </div>
          );
        })}
      </div>
      {insight && <div className={styles.journeyInsight}>{insight}</div>}
    </div>
  );
}

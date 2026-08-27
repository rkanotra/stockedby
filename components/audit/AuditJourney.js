"use client";

import styles from "../test/test.module.css";

// Visually consistent with /test's BuyerJourney (Discover -> Consider ->
// Buy) — same signature shape, Find -> Understand -> Buy here. Status
// word only, never a raw score (CLAUDE.md's redesign phase: "don't make
// category scores the product" — the numeric score stays in the Layer 2
// technical detail via LayerCard.js, unchanged).
const STAGE_CLASS = { "Not ready": "weak", "Needs work": "growing", Ready: "strongStage" };

const STAGE_DETAIL = {
  find: {
    Ready: "AI apps can crawl your site.",
    "Needs work": "Some AI apps may have trouble reaching your site.",
    "Not ready": "Major AI apps are currently blocked from your site.",
    "Not checked": "We couldn't check this yet.",
  },
  understand: {
    Ready: "AI apps can read what you sell.",
    "Needs work": "AI apps can reach your site, but product data is incomplete.",
    "Not ready": "AI apps can't tell what your shop sells.",
    "Not checked": "We couldn't check this yet.",
  },
  buy: {
    Ready: "Your store exposes the signals we check for agent-driven purchasing.",
    "Needs work": "Some signals for future agent-driven purchasing are missing.",
    "Not ready": "Your store doesn't yet expose the signals we're checking for future agent-driven purchasing — this is emerging infrastructure, not a current standard.",
    "Not checked": "We couldn't check this yet.",
  },
};

export default function AuditJourney({ journey }) {
  const { stages, headline } = journey;
  return (
    <div>
      <div className={styles.h2}>Your AI Store Journey</div>
      <div className={styles.journey}>
        {stages.map((s) => {
          const stageClass = STAGE_CLASS[s.status] ? styles[STAGE_CLASS[s.status]] : "";
          return (
            <div key={s.key} className={`${styles.journeyStage} ${stageClass}`}>
              <span className={styles.journeyStageLabel}>{s.label}</span>
              <span className={`${styles.journeyStageStatus} ${stageClass || styles.notchecked}`}>{s.status}</span>
              <p className={styles.journeyStageDetail}>{STAGE_DETAIL[s.key]?.[s.status] || ""}</p>
            </div>
          );
        })}
      </div>
      <div className={styles.journeyInsight}>{headline}</div>
    </div>
  );
}

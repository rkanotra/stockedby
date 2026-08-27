"use client";

import styles from "../test.module.css";
import { buildAppearanceStory } from "@/lib/layerOne";

// The result-driven headline the founder-first redesign is built around
// (CLAUDE.md's redesign phase) — never a generic "Your AI Visibility."
// Traceable to real data only: appearance.verdict (YES/SOMETIMES/NO,
// lib/layerOne.js's buildAppearanceStory) and whether a real gap exists
// (biggestOpportunity, lib/founderReport.js — null when the data doesn't
// support naming one).
function buildHeadline({ appearance, opportunity, brand }) {
  if (appearance.verdict === "NO") return `AI isn't recommending ${brand} yet.`;
  if (appearance.verdict === "YES" && !opportunity) return `AI knows ${brand} — and recommends you.`;
  return `AI knows ${brand}. But it isn't choosing you first.`;
}

export default function AIVisibilityHero({ brand, report, visibility, buyerJourney, biggestOpportunity, competitorThreat }) {
  const appearance = buildAppearanceStory(report.appearanceSummary);
  const headline = buildHeadline({ appearance, opportunity: biggestOpportunity, brand });
  const competitorCount = competitorThreat ? 1 + competitorThreat.others.length : 0;

  return (
    <div>
      <span className={styles.founderEyebrow}>{brand}</span>
      <h1 className={styles.founderHeadline}>{headline}</h1>

      <div className={styles.founderScoreRow}>
        <span className={styles.founderScore}>{visibility.score}</span>
        <span className={styles.founderScoreMax}>/ 100</span>
        <span className={styles.founderScoreBand}>{visibility.band} visibility</span>
      </div>

      <p className={styles.founderExplain}>
        {appearance.verdict === "NO"
          ? `${brand} hasn't come up yet when AI answers real shopper questions in this category.`
          : buyerJourney.insight || `${brand} appears when shoppers ask AI what to buy, but not every time.`}
      </p>

      <div className={styles.founderStats}>
        <div className={styles.founderStat}>
          <span className={styles.founderStatValue}>
            {appearance.appearedIn} of {appearance.totalAttempted}
          </span>
          <span className={styles.founderStatLabel}>shopper questions</span>
        </div>
        {report.appearanceSummary?.bestRank && (
          <div className={styles.founderStat}>
            <span className={styles.founderStatValue}>#{report.appearanceSummary.bestRank}</span>
            <span className={styles.founderStatLabel}>best rank</span>
          </div>
        )}
        {competitorCount > 0 && (
          <div className={styles.founderStat}>
            <span className={styles.founderStatValue}>{competitorCount}</span>
            <span className={styles.founderStatLabel}>competitor{competitorCount === 1 ? "" : "s"} frequently ahead</span>
          </div>
        )}
      </div>
    </div>
  );
}

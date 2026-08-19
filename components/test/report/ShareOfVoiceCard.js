"use client";

import styles from "../test.module.css";
import { RIVAL_LABELS } from "@/lib/scoring";

export default function ShareOfVoiceCard({ market, brand, competitor, shareOfVoice }) {
  const rivalLabel = RIVAL_LABELS[market] || "Amazon";
  const hasComp = shareOfVoice.competitor !== null;

  return (
    <div className={styles.card}>
      <div className={styles.h2}>Share of AI Voice</div>
      <div className={styles.sov}>
        <div style={{ width: `${shareOfVoice.you}%`, background: "#ffc53d" }} />
        {hasComp && <div style={{ width: `${shareOfVoice.competitor}%`, background: "#4a9fd8" }} />}
        <div style={{ width: `${shareOfVoice.rival}%`, background: "#ff6b57" }} />
        <div style={{ width: `${shareOfVoice.other}%`, background: "#3a5a48" }} />
      </div>
      <div className={styles.sovrow}>
        <span>You · {brand}</span>
        <span className={styles.p}>{shareOfVoice.you}%</span>
      </div>
      {hasComp && (
        <div className={styles.sovrow}>
          <span>{competitor}</span>
          <span className={styles.p}>{shareOfVoice.competitor}%</span>
        </div>
      )}
      <div className={styles.sovrow}>
        <span>{rivalLabel}</span>
        <span className={styles.p}>{shareOfVoice.rival}%</span>
      </div>
      <div className={styles.sovrow}>
        <span>Everyone else</span>
        <span className={styles.p}>{shareOfVoice.other}%</span>
      </div>
    </div>
  );
}

"use client";

import styles from "./test.module.css";

// "KSA" stays the internal market key (matches data/ksa.json + lib/bank.js)
// but reads as "Saudi Arabia" here — same convention the old SetupPanel used.
const MARKET_LABELS = { India: "India", UAE: "UAE", KSA: "Saudi Arabia" };
const MARKET_LINE = {
  India: "Shoppers ask in English and Hinglish.",
  UAE: "Shoppers ask in English and Arabic.",
  KSA: "Shoppers ask in English and Arabic.",
};

export default function MarketStep({ markets, onPick, onBack }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>Where do you sell?</span>
      <div className={styles.marketCards}>
        {markets.map((m) => (
          <button key={m} type="button" className={styles.marketCard} onClick={() => onPick(m)}>
            <span className={styles.marketCardName}>{MARKET_LABELS[m] || m}</span>
            <span className={styles.marketCardLine}>{MARKET_LINE[m] || ""}</span>
          </button>
        ))}
      </div>
      <button type="button" className={styles.btnGhost} onClick={onBack}>
        Back
      </button>
    </div>
  );
}

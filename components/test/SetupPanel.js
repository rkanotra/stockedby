"use client";

import styles from "./test.module.css";

// Display copy for the market-selector cards. "KSA" stays the internal
// market key (matches data/ksa.json + lib/bank.js) but reads as "Saudi
// Arabia" in the UI.
const MARKET_LABELS = { India: "India", UAE: "UAE", KSA: "Saudi Arabia" };
const MARKET_VS = {
  India: "Flipkart / Amazon.in",
  UAE: "Noon / Amazon.ae",
  KSA: "Amazon.sa / Jarir",
};

export default function SetupPanel({ markets, market, onMarket, categories, search, onSearch, onPick, onCustomPick }) {
  const filtered = categories.filter(
    (c) =>
      (c.queries || []).length > 0 &&
      `${c.name} ${c.group || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.card}>
      <span className={styles.label}>Market</span>
      <div className={styles.tabsRow}>
        {markets.map((m) => (
          <button
            key={m}
            type="button"
            className={`${styles.marketTab} ${market === m ? styles.active : ""}`}
            onClick={() => onMarket(m)}
          >
            {MARKET_LABELS[m] || m}
            <span className={styles.st}>vs {MARKET_VS[m] || ""}</span>
          </button>
        ))}
      </div>
      <span className={styles.label}>What do you sell?</span>
      <input
        className={styles.input}
        placeholder="Search categories… e.g. serum, earbuds, abaya"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
      />
      <div className={styles.catlist}>
        {filtered.slice(0, 40).map((c) => (
          <div className={styles.catrow} key={c.id} onClick={() => onPick(c.id)}>
            <span>{c.name}</span>
            <span className={styles.g}>{(c.snapshots || []).length ? "● data" : ""}</span>
          </div>
        ))}
        {filtered.length === 0 && search.trim() && (
          <div className={styles.catrow} style={{ color: "#ffc53d" }} onClick={() => onCustomPick(search.trim())}>
            <span>Test &ldquo;{search.trim()}&rdquo; as a custom category →</span>
          </div>
        )}
        {filtered.length === 0 && !search.trim() && (
          <div className={styles.catrow} style={{ cursor: "default", color: "#7fa18c" }}>
            No matching category
          </div>
        )}
      </div>
    </div>
  );
}

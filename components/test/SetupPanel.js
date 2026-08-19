"use client";

import styles from "./test.module.css";

export default function SetupPanel({ markets, market, onMarket, categories, search, onSearch, onPick }) {
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
            {m}
            <span className={styles.st}>vs {m === "GCC" ? "Noon / Amazon.ae" : "Flipkart / Amazon.in"}</span>
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
        {filtered.length === 0 && (
          <div className={styles.catrow} style={{ cursor: "default", color: "#7fa18c" }}>
            No matching category
          </div>
        )}
      </div>
    </div>
  );
}

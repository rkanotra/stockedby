"use client";

import { useState } from "react";
import styles from "./test.module.css";
import { getMarketProfile } from "@/lib/marketProfiles";

// Search box only appears once the picker has enough markets that scanning
// them all gets tedious (market-expansion phase's own "~8" threshold) —
// inactive today at 7 listed markets, wired up for when an 8th lands.
const SEARCH_THRESHOLD = 8;

export default function MarketStep({ markets, guessedMarket, onPick, onBack }) {
  const [search, setSearch] = useState("");
  const showSearch = markets.length > SEARCH_THRESHOLD;
  const q = search.trim().toLowerCase();
  const visible = showSearch && q
    ? markets.filter((m) => (getMarketProfile(m)?.countryName || m).toLowerCase().includes(q))
    : markets;

  return (
    <div className={styles.card}>
      <span className={styles.label}>Where do you sell?</span>
      {guessedMarket && (
        <p className={styles.hint}>
          Looks like you might sell in {getMarketProfile(guessedMarket)?.countryName || guessedMarket} — pick below
          (or choose a different one).
        </p>
      )}
      {showSearch && (
        <input
          type="text"
          className={styles.input}
          placeholder="Search markets"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search markets"
        />
      )}
      <div className={styles.marketCards}>
        {visible.map((m) => (
          <button key={m} type="button" className={styles.marketCard} onClick={() => onPick(m)}>
            <span className={styles.marketCardName}>{getMarketProfile(m)?.countryName || m}</span>
            <span className={styles.marketCardLine}>{getMarketProfile(m)?.marketLine || ""}</span>
          </button>
        ))}
      </div>
      <button type="button" className={styles.btnGhost} onClick={onBack}>
        Back
      </button>
    </div>
  );
}

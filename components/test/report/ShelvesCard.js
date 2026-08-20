"use client";

import { useState } from "react";
import styles from "../test.module.css";
import { ENGINES, ENGINE_LABELS, ARCH_LABELS, DEST_LABELS, matches, isRivalFor } from "@/lib/scoring";

const DEST_COLORS = {
  "brand-direct": "#5bd6a0",
  marketplace: "#ff6b57",
  aggregator: "#4a9fd8",
  none: "#3a5a48",
};

export default function ShelvesCard({ market, brand, competitor, engines }) {
  const [activeEngine, setActiveEngine] = useState("claude");
  const isRival = isRivalFor(market);
  const hasComp = Boolean(competitor && competitor.trim());

  const engineTabInfo = (e) => {
    const rows = engines[e] || [];
    if (e === "claude") return "live";
    const withData = rows.find((r) => r.source !== "missing");
    return withData ? withData.collected_on : "data coming soon";
  };

  const activeRows = (engines[activeEngine] || []).filter((r) => r.source !== "missing");
  const missingCount = (engines[activeEngine] || []).filter((r) => r.source === "missing").length;

  return (
    <div className={styles.card}>
      <div className={styles.h2}>The shelves</div>
      <p className={styles.sectionHint}>
        Every AI engine&rsquo;s actual ranked answer, side by side — see where you rank against
        competitors on each one.
      </p>
      <div className={styles.tabs}>
        {ENGINES.map((e) => (
          <button
            key={e}
            type="button"
            className={`${styles.tab} ${activeEngine === e ? styles.active : ""}`}
            onClick={() => setActiveEngine(e)}
          >
            {ENGINE_LABELS[e]}
            <span className={styles.st}>{engineTabInfo(e)}</span>
          </button>
        ))}
      </div>

      {activeRows.map((r) => {
        const youIdx = r.recs.findIndex((rec) => matches(brand, rec.brand) || matches(brand, rec.product));
        const compIdx = hasComp
          ? r.recs.findIndex((rec) => matches(competitor, rec.brand) || matches(competitor, rec.product))
          : -1;
        return (
          <div className={styles.shelf} key={r.qid}>
            <p className={styles.shelfQ} dir="auto">
              <span className={styles.arch} style={{ marginRight: 8, marginBottom: 0 }}>
                {ARCH_LABELS[r.archetype] || r.archetype}
              </span>
              “{r.text}”
            </p>
            <div className={styles.slots}>
              {r.recs.map((rec, j) => {
                const tagClass =
                  j === youIdx ? styles.tagYou : j === compIdx ? styles.tagComp : isRival(rec.brand) ? styles.tagAmz : "";
                return (
                  <div key={j} className={`${styles.tag} ${tagClass}`} title={rec.product}>
                    <span className={styles.rk}>#{j + 1}</span>
                    {rec.brand}
                    {rec.destination && rec.destination !== "none" && (
                      <span
                        className={styles.dest}
                        style={{ color: j === youIdx ? "#17251f" : DEST_COLORS[rec.destination] }}
                      >
                        → {DEST_LABELS[rec.destination]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className={styles.plank} />
            {youIdx === -1 && <div className={styles.missing}>✕ {brand} is not on this shelf</div>}
          </div>
        );
      })}

      {activeEngine !== "claude" && activeRows.length === 0 && (
        <div className={styles.notharvested}>
          {ENGINE_LABELS[activeEngine]} data coming soon for this category — check back soon.
        </div>
      )}
      {activeEngine !== "claude" && activeRows.length > 0 && missingCount > 0 && (
        <div className={styles.notharvested}>
          {ENGINE_LABELS[activeEngine]} data coming soon for {missingCount} of these question
          {missingCount === 1 ? "" : "s"}.
        </div>
      )}
    </div>
  );
}

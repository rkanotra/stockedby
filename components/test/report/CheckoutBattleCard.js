"use client";

import styles from "../test.module.css";
import { DEST_LABELS, domainsMatch } from "@/lib/scoring";

const DEST_COLORS = {
  "brand-direct": "#5bd6a0",
  marketplace: "#ff6b57",
  aggregator: "#4a9fd8",
  none: "#3a5a48",
};

export default function CheckoutBattleCard({ brand, brandWebsite, destinations }) {
  const { tally, pct, yourDestinations } = destinations;
  const slotTotal = Object.values(tally).reduce((a, b) => a + b, 0);
  if (slotTotal === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.h2}>The checkout battle</div>
      <div className={styles.sov}>
        {Object.keys(DEST_COLORS).map((k) => (
          <div key={k} style={{ width: `${pct[k]}%`, background: DEST_COLORS[k] }} />
        ))}
      </div>
      {Object.keys(DEST_COLORS).map((k) => (
        <div className={styles.sovrow} key={k}>
          <span>{DEST_LABELS[k]}</span>
          <span className={styles.p}>{pct[k]}%</span>
        </div>
      ))}
      {yourDestinations.length > 0 && (
        <>
          <span className={styles.label} style={{ marginTop: 12 }}>
            When AI recommends {brand}, buyers go to
          </span>
          {yourDestinations.map(([dom, n]) => (
            <div className={styles.sovrow} key={dom}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                {dom}
                {brandWebsite && domainsMatch(dom, brandWebsite) && (
                  <span className={styles.matchBadge}>your site</span>
                )}
              </span>
              <span className={styles.p}>{n}×</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

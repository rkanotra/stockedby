"use client";

import styles from "../test.module.css";
import { DEST_LABELS, domainsMatch } from "@/lib/scoring";

// Verdict-adjacent colours (hard rule 5): brand-direct is neutral (no
// green — a good outcome doesn't need to shout), marketplace is the one
// accent segment (the commission-loss problem this card exists to
// surface), aggregator keeps its own distinct brand-comparison blue
// (unrelated to the pine/verdict migration), none is the darkest neutral.
const DEST_COLORS = {
  "brand-direct": "var(--text-secondary)",
  marketplace: "var(--accent)",
  aggregator: "#4a9fd8",
  none: "var(--border-strong)",
};

export default function CheckoutBattleCard({ brand, brandWebsite, destinations }) {
  const { tally, pct, yourDestinations } = destinations;
  const slotTotal = Object.values(tally).reduce((a, b) => a + b, 0);
  if (slotTotal === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.h2}>The checkout battle</div>
      <p className={styles.sectionHint}>
        Where AI sends the buyer to actually pay — your own site, or someone else&rsquo;s marketplace
        collecting a commission on the sale.
      </p>
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
          {yourDestinations.map((d) => (
            <div className={styles.sovrow} key={d.domain}>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
                {d.domain}
                <span className={styles.matchBadge}>{DEST_LABELS[d.destination]}</span>
                {brandWebsite && domainsMatch(d.domain, brandWebsite) && (
                  <span className={styles.matchBadge}>your site</span>
                )}
              </span>
              <span className={styles.p}>{d.count}×</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

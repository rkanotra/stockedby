"use client";

import { useState } from "react";
import styles from "../test.module.css";
import { ENGINE_LABELS } from "@/lib/scoring";

// "Where AI sends your customers" (renamed from "the checkout battle" —
// CLAUDE.md's redesign phase / banned-word list) — the 2-number split
// that matters, business impact in two short columns, full domain list
// behind a toggle. Falls back to an honest "we couldn't reliably
// determine this" state when lib/founderReport.js's buildDestinationSplit()
// found no real destination data — never forces a conclusion.
export default function DestinationSummary({ brand, destinationSplit, destinationSplitByEngine, yourDestinations }) {
  const [showLinks, setShowLinks] = useState(false);

  if (!destinationSplit) {
    return (
      <div className={styles.card}>
        <div className={styles.h2}>Where AI sends your customers</div>
        <p className={styles.sectionHint}>
          We couldn&rsquo;t reliably determine where AI sends shoppers for {brand} yet.
        </p>
      </div>
    );
  }

  const { ownSitePct, marketplacePct } = destinationSplit;
  const headline =
    marketplacePct > ownSitePct
      ? `${marketplacePct}% of your AI purchase recommendations go to marketplaces.`
      : `${ownSitePct}% of your AI purchase recommendations go straight to your own site.`;

  const own = (yourDestinations || []).filter((d) => d.destination === "brand-direct");
  const market = (yourDestinations || []).filter((d) => d.destination !== "brand-direct" && d.destination !== "none");

  return (
    <div className={styles.card}>
      <div className={styles.h2}>Where AI sends your customers</div>
      <p className={styles.sectionHint}>{headline}</p>
      <div className={styles.destSplitBar}>
        <div style={{ width: `${ownSitePct}%`, background: "var(--accent)" }} />
        <div style={{ width: `${marketplacePct}%`, background: "var(--border-strong)" }} />
      </div>
      <div className={styles.sovrow}>
        <span>Your website</span>
        <span className={styles.p}>{ownSitePct}%</span>
      </div>
      <div className={styles.sovrow}>
        <span>Marketplaces</span>
        <span className={styles.p}>{marketplacePct}%</span>
      </div>

      {destinationSplitByEngine && Object.keys(destinationSplitByEngine).length > 1 && (
        <div style={{ marginTop: 4, marginBottom: 4 }}>
          <div className={styles.destImpactColTitle}>By AI app</div>
          {Object.entries(destinationSplitByEngine).map(([engine, split]) => (
            <div className={styles.sovrow} key={engine}>
              <span>{ENGINE_LABELS[engine] || engine}</span>
              <span className={styles.p}>
                {split.ownSitePct}% own site · {split.marketplacePct}% marketplace
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.destImpact}>
        <div>
          <div className={styles.destImpactColTitle}>Your website</div>
          <ul className={styles.destImpactList}>
            <li>✓ You own the customer relationship</li>
            <li>✓ No marketplace commission</li>
            <li>✓ Better first-party data</li>
          </ul>
        </div>
        <div>
          <div className={styles.destImpactColTitle}>Marketplace</div>
          <ul className={styles.destImpactList}>
            <li>⚠ Third party owns checkout</li>
            <li>⚠ Potential commission</li>
            <li>⚠ Less direct customer data</li>
          </ul>
        </div>
      </div>

      {(own.length > 0 || market.length > 0) && (
        <>
          <button
            type="button"
            className={styles.disclosureToggle}
            onClick={() => setShowLinks((v) => !v)}
            aria-expanded={showLinks}
          >
            {showLinks ? "Hide destination links" : "View destination links →"}
          </button>
          {showLinks && (
            <div style={{ marginTop: 10 }}>
              {own.length > 0 && (
                <>
                  <div className={styles.destImpactColTitle}>Your website</div>
                  {own.map((d) => (
                    <div className={styles.sovrow} key={d.domain}>
                      <span>{d.domain}</span>
                      <span className={styles.p}>{d.count}×</span>
                    </div>
                  ))}
                </>
              )}
              {market.length > 0 && (
                <>
                  <div className={styles.destImpactColTitle} style={{ marginTop: 10 }}>
                    Marketplaces
                  </div>
                  {market.map((d) => (
                    <div className={styles.sovrow} key={d.domain}>
                      <span>{d.domain}</span>
                      <span className={styles.p}>{d.count}×</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

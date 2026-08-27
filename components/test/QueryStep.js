"use client";

import styles from "./test.module.css";
import { effectiveQueryText } from "@/lib/queryPersonalize";

// Brand/website/market/category are all collected in earlier wizard steps
// now (DomainStep/BrandStep/MarketStep/CategoryStep) — this screen is just
// the questions themselves, editable, then run. No archetype/language
// badge here on purpose: those labels (lib/scoring.js's ARCH_LABELS) are
// shared with the report page, which keeps its current explainer style —
// simplifying them here would leak into there too, so this screen just
// drops the badge entirely instead.
export default function QueryStep({ categoryName, isCustom, brand, queries, onQueryText, onStart, onBack, error }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{categoryName}</span>
      {isCustom && (
        <div className={styles.customNote}>
          We wrote these questions for you — they aren&rsquo;t part of our standard set, so
          scores here won&rsquo;t compare exactly to other brands.
        </div>
      )}
      <p className={styles.hint} style={{ marginTop: 0 }}>
        These are the questions real shoppers ask — edit if you like.
      </p>
      {queries.map((q, i) => (
        <textarea
          key={q.qid}
          className={styles.qedit}
          value={effectiveQueryText(q, brand)}
          dir="auto"
          aria-label={`Question ${i + 1}`}
          onChange={(e) => onQueryText(q.qid, e.target.value)}
        />
      ))}

      {/* Quiet, no red box (the agreed failure pattern — see
          VerdictCard.js's own partial-failure handling) — a scoring
          failure isn't the merchant's fault and shouldn't read as an
          alarm about their input. */}
      {error && <p className={styles.retryHint}>{error}</p>}

      <button type="button" className={styles.btn} onClick={onStart}>
        Show my report
      </button>
      <button type="button" className={styles.btnGhost} onClick={onBack}>
        Back
      </button>
    </div>
  );
}

"use client";

import styles from "./test.module.css";
import { ARCH_LABELS } from "@/lib/scoring";
import { effectiveQueryText } from "@/lib/queryPersonalize";

export default function ReadyPanel({
  category,
  isCustom,
  brand,
  onBrand,
  website,
  onWebsite,
  competitor,
  onCompetitor,
  queries,
  onQueryText,
  onStart,
  onBack,
  error,
}) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>Category · {category.name}</span>
      {isCustom && (
        <div className={styles.customNote}>
          AI-generated for this custom category — review each question below before running.
          Custom-test scores aren&rsquo;t part of the standardized benchmark, so they&rsquo;re not
          comparable across brands.
        </div>
      )}
      <input
        className={styles.input}
        placeholder="Your brand name"
        value={brand}
        onChange={(e) => onBrand(e.target.value)}
        autoComplete="organization"
      />
      <input
        className={styles.input}
        type="url"
        placeholder="Your brand website (optional) — e.g. yourbrand.com"
        value={website}
        onChange={(e) => onWebsite(e.target.value)}
        autoComplete="url"
      />
      <input
        className={styles.input}
        placeholder="Competitor to track (optional)"
        value={competitor}
        onChange={(e) => onCompetitor(e.target.value)}
      />
      <span className={styles.hint} style={{ marginTop: 0 }}>
        Your website is used to credit AI recommendations that link straight to you as
        brand-direct, even if the engine labels the link differently.
      </span>

      <span className={styles.label}>Shopper questions for this category</span>
      <p className={styles.hint}>
        Standardized so your score is comparable with every other brand tested. The routing
        question below is already personalized to test <strong>your</strong> checkout routing —
        edit any question if needed.
      </p>
      {queries.map((q, i) => (
        <div key={q.qid}>
          <textarea
            className={styles.qedit}
            value={effectiveQueryText(q, brand)}
            dir="auto"
            aria-label={`Query ${i + 1}`}
            onChange={(e) => onQueryText(q.qid, e.target.value)}
          />
          <span className={styles.arch}>
            {ARCH_LABELS[q.archetype] || q.archetype}
            {q.language && <span className={styles.lang}> · {q.language}</span>}
          </span>
        </div>
      ))}

      {error && <div className={styles.errBanner}>{error}</div>}

      <button type="button" className={styles.btn} onClick={onStart} disabled={!brand.trim()}>
        Run the shelf test
      </button>
      <button type="button" className={styles.btnGhost} onClick={onBack}>
        Change category
      </button>
    </div>
  );
}

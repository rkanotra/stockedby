"use client";

import styles from "./test.module.css";

// Custom-category flow, step 1 (between SetupPanel and ReadyPanel): the
// merchant's search had no bank match, so before we can generate questions
// (POST /api/generate-queries) we need their brand — the branded-routing
// question asks about it directly rather than guessing a category leader.
export default function CustomCategoryPanel({ categoryName, market, brand, onBrand, onGenerate, onBack, generating, error }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>Custom category</span>
      <p className={styles.hint} style={{ marginTop: 0 }}>
        &ldquo;{categoryName}&rdquo; isn&rsquo;t in our {market} category bank yet. We&rsquo;ll
        generate 4 real shopper questions for it — you review and can edit every one before
        anything runs.
      </p>
      <input
        className={styles.input}
        placeholder="Your brand name"
        value={brand}
        onChange={(e) => onBrand(e.target.value)}
        autoComplete="organization"
        autoFocus
      />
      <span className={styles.hint} style={{ marginTop: -8 }}>
        Needed now so the branded-routing question asks about your brand specifically, not a
        guessed category leader.
      </span>

      {error && <div className={styles.errBanner}>{error}</div>}

      <button
        type="button"
        className={styles.btn}
        onClick={onGenerate}
        disabled={!brand.trim() || generating}
      >
        {generating ? "Generating questions…" : "Generate my questions"}
      </button>
      <button type="button" className={styles.btnGhost} onClick={onBack} disabled={generating}>
        Back to categories
      </button>
    </div>
  );
}

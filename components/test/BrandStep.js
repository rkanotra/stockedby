"use client";

import styles from "./test.module.css";

export default function BrandStep({ brand, onBrand, onNext, onBack }) {
  function handleSubmit(e) {
    e.preventDefault();
    if (!brand.trim()) return;
    onNext();
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="test-brand">Your brand name</label>
      <p className={styles.hint} style={{ marginTop: 0 }}>
        We guessed this from your website — change it if it&rsquo;s not right.
      </p>
      <input
        id="test-brand"
        className={styles.input}
        placeholder="Your brand name"
        value={brand}
        onChange={(e) => onBrand(e.target.value)}
        autoFocus
        autoComplete="organization"
      />
      <button type="submit" className={styles.btn} disabled={!brand.trim()}>
        Continue
      </button>
      <button type="button" className={styles.btnGhost} onClick={onBack}>
        Back
      </button>
    </form>
  );
}

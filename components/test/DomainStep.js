"use client";

import styles from "./test.module.css";

export default function DomainStep({ domain, onDomain, onNext }) {
  function handleSubmit(e) {
    e.preventDefault();
    if (!domain.trim()) return;
    onNext();
  }

  return (
    <form className={styles.card} onSubmit={handleSubmit}>
      <label className={styles.label} htmlFor="test-domain">Your website</label>
      <p className={styles.hint} style={{ marginTop: 0 }}>
        We use this to guess your brand name and to spot your own site in the report.
      </p>
      <input
        id="test-domain"
        className={styles.input}
        type="text"
        inputMode="url"
        placeholder="yourbrand.com"
        value={domain}
        onChange={(e) => onDomain(e.target.value)}
        autoFocus
        autoComplete="url"
      />
      <button type="submit" className={styles.btn} disabled={!domain.trim()}>
        Continue
      </button>
    </form>
  );
}

"use client";

import { useEffect } from "react";
import styles from "./test.module.css";

// Freshness signal (market-expansion phase): a zero-result search is both a
// UX signal and the query-bank expansion list — debounced (~800ms after
// typing settles) and only for a real, deliberate-looking search (>=3
// chars), so this doesn't fire on every keystroke of an incomplete search.
// Best-effort, fire-and-forget — a logging failure never affects the
// wizard itself.
function useFailedSearchLogger(market, search, hasResults) {
  useEffect(() => {
    const trimmed = search.trim();
    if (hasResults || trimmed.length < 3) return;
    const timer = setTimeout(() => {
      fetch("/api/log-failed-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, searchText: trimmed }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(timer);
  }, [market, search, hasResults]);
}

export default function CategoryStep({ market, categories, search, onSearch, onPick, onCustomPick, onBack }) {
  const filtered = categories.filter(
    (c) =>
      (c.queries || []).length > 0 &&
      `${c.name} ${c.group || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  useFailedSearchLogger(market, search, filtered.length > 0);

  return (
    <div className={styles.card}>
      <span className={styles.label}>Pick your most important product to start</span>
      <p className={styles.hint} style={{ marginTop: 0 }}>
        You can test another product right after — each gets its own report.
      </p>
      <input
        className={styles.input}
        placeholder="e.g. serum, earbuds, abaya"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        autoFocus
      />
      <div className={styles.catlistBig}>
        {filtered.slice(0, 40).map((c) => (
          <div className={styles.catrowBig} key={c.id} onClick={() => onPick(c.id)}>
            {c.name}
          </div>
        ))}
        {filtered.length === 0 && search.trim() && (
          <div
            className={styles.catrowBig}
            style={{ color: "var(--accent)" }}
            onClick={() => onCustomPick(search.trim())}
          >
            Test &ldquo;{search.trim()}&rdquo; — we&rsquo;ll write the questions →
          </div>
        )}
        {filtered.length === 0 && !search.trim() && (
          <div className={styles.catrowBig} style={{ cursor: "default", color: "var(--text-muted)" }}>
            Type to search
          </div>
        )}
      </div>
      <button type="button" className={styles.btnGhost} onClick={onBack}>
        Back
      </button>
    </div>
  );
}

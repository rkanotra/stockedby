"use client";

import styles from "./test.module.css";

export default function CategoryStep({ categories, search, onSearch, onPick, onCustomPick, onBack }) {
  const filtered = categories.filter(
    (c) =>
      (c.queries || []).length > 0 &&
      `${c.name} ${c.group || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.card}>
      <span className={styles.label}>What do you sell?</span>
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
            style={{ color: "#ffc53d" }}
            onClick={() => onCustomPick(search.trim())}
          >
            Test &ldquo;{search.trim()}&rdquo; — we&rsquo;ll write the questions →
          </div>
        )}
        {filtered.length === 0 && !search.trim() && (
          <div className={styles.catrowBig} style={{ cursor: "default", color: "#7fa18c" }}>
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

"use client";

import styles from "../test/test.module.css";

// The key branching point (CLAUDE.md's redesign phase): the merchant
// picks how they want to install the fix once, instead of every action
// (copy link, unlock, send to developer) competing for attention at
// once. FixResults.js renders only the chosen panel below this.
export default function InstallationMode({ mode, onChange }) {
  return (
    <div className={styles.card}>
      <div className={styles.h2}>How do you want to install this?</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className={styles.btnGhost}
          aria-pressed={mode === "self"}
          style={{
            width: "auto",
            flex: "1 1 160px",
            marginTop: 0,
            minHeight: 44,
            ...(mode === "self" ? {} : { borderColor: "var(--border-strong)", color: "var(--text-muted)" }),
          }}
          onClick={() => onChange("self")}
        >
          I&rsquo;ll do it myself
        </button>
        <button
          type="button"
          className={styles.btnGhost}
          aria-pressed={mode === "developer"}
          style={{
            width: "auto",
            flex: "1 1 160px",
            marginTop: 0,
            minHeight: 44,
            ...(mode === "developer" ? {} : { borderColor: "var(--border-strong)", color: "var(--text-muted)" }),
          }}
          onClick={() => onChange("developer")}
        >
          Send to my developer
        </button>
      </div>
    </div>
  );
}

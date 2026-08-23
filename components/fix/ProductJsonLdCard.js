"use client";

import { useState } from "react";
import styles from "../test/test.module.css";

// One product's result — either an honest error (page fetched but couldn't
// be read as a product, or couldn't be fetched at all — hard rule 2, never
// invent data) or a real, paste-ready JSON-LD block with a copy button.
export default function ProductJsonLdCard({ result }) {
  const [copied, setCopied] = useState(false);
  const { url, status, product, jsonLd, error } = result;

  async function copyJsonLd() {
    const text = JSON.stringify(jsonLd, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard permission denied — the block is still selectable/copyable by hand
    }
  }

  if (status !== "done") {
    return (
      <div className={styles.card}>
        <span className={styles.label}>Couldn&rsquo;t read this page</span>
        <p className={styles.productMeta}>{url}</p>
        <p className={styles.productErr}>{error || "Something went wrong reading this page."}</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.productName}>{product.name}</div>
      <p className={styles.productMeta}>{url}</p>
      <div className={styles.codeBlockHead}>
        <span className={styles.label} style={{ margin: 0 }}>
          Paste this before &lt;/head&gt;
        </span>
        <button type="button" className={styles.copyBtn} onClick={copyJsonLd}>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className={styles.codeBlock}>
        {`<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`}
      </pre>
    </div>
  );
}

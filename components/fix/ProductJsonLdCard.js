"use client";

import { useState } from "react";
import styles from "../test/test.module.css";

// "What machines will understand" — plain rows before any code, so the
// value is tangible before a founder has to look at JSON (CLAUDE.md's
// redesign phase). Only real, extracted fields — never a guessed default
// (hard rule 2), matching the same discipline lib/audit/fixGenerator.js's
// buildProductJsonLd() already applies.
function HumanReadablePreview({ product }) {
  const rows = [
    ["Product", product.name],
    ["Brand", product.brand],
    ["Price", product.price != null ? `${product.currency ? `${product.currency} ` : ""}${product.price}` : null],
    ["Availability", product.availability],
  ].filter(([, value]) => value);
  if (rows.length === 0) return null;
  return (
    <div style={{ marginBottom: 12 }}>
      <span className={styles.label}>What machines will understand</span>
      {rows.map(([label, value]) => (
        <div className={styles.sovrow} key={label}>
          <span>{label}</span>
          <span className={styles.p}>{value}</span>
        </div>
      ))}
    </div>
  );
}

// One product's result. Four founder-facing outcomes, never just
// done/error (hard rule 2's "never invent success either" applies here
// too — a broken or duplicate fix must never look ready to paste):
//   done          — a real, validated JSON-LD block, code collapsed by
//                   default behind "View code" (~80% less code visible,
//                   CLAUDE.md's redesign phase target).
//   already-good  — the page's OWN existing JSON-LD already covers every
//                   required field; no duplicate code generated.
//   invalid       — generated code failed validation; never shown as if
//                   it were ready to paste.
//   error         — the page couldn't be read as a product at all.
// hideCode (Shopify/WooCommerce): the platform gets ONE reusable dynamic
// snippet instead of N per-product blocks (see FixResults.js) — this
// card still shows the human-readable preview, just skips its own code
// block since the reusable snippet already covers every product.
export default function ProductJsonLdCard({ result, hideCode = false }) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
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

  if (status === "error") {
    return (
      <div className={styles.card}>
        <span className={styles.label}>Couldn&rsquo;t read this page</span>
        <p className={styles.productMeta}>{url}</p>
        <p className={styles.productErr}>{error || "Something went wrong reading this page."}</p>
      </div>
    );
  }

  if (status === "already-good") {
    return (
      <div className={styles.card}>
        <div className={styles.productName}>{product?.name || url}</div>
        <p className={styles.productMeta}>{url}</p>
        <p className={styles.storyLine} style={{ marginTop: 0 }}>
          Already has complete data — AI apps can already read this product page.
        </p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className={styles.card}>
        <div className={styles.productName}>{product?.name || url}</div>
        <p className={styles.productMeta}>{url}</p>
        <p className={styles.productErr}>We couldn&rsquo;t safely generate this fix yet.</p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.productName}>{product.name}</div>
      <p className={styles.productMeta}>{url}</p>
      <HumanReadablePreview product={product} />
      {!hideCode && (
        <>
          <div className={styles.codeBlockHead}>
            <span className={styles.label} style={{ margin: 0 }}>
              Product structured data
            </span>
            <button type="button" className={styles.copyBtn} onClick={() => setShowCode((v) => !v)}>
              {showCode ? "Hide code" : "View code"}
            </button>
          </div>
          {showCode && (
            <>
              <pre className={styles.codeBlock}>
                {`<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`}
              </pre>
              <button type="button" className={styles.copyBtn} style={{ marginTop: 8 }} onClick={copyJsonLd}>
                {copied ? "Copied" : "Copy code"}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

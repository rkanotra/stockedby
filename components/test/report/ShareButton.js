"use client";

import { useState } from "react";
import styles from "../test.module.css";

// window.location.origin (not a hardcoded site constant) so the copied
// link always matches whatever domain the visitor is actually on — preview
// deployments, a future domain change, or localhost during dev all just work.
export default function ShareButton({ slug }) {
  const [copied, setCopied] = useState(false);
  if (!slug) return null;

  async function handleCopy() {
    const url = `${window.location.origin}/report/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail (permissions, insecure context) — no error
      // banner for this; the button just stays clickable to retry.
    }
  }

  return (
    <button type="button" className={styles.btnGhost} onClick={handleCopy}>
      {copied ? "Link copied ✓" : "Share this report"}
    </button>
  );
}

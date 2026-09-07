"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../test/test.module.css";

// Catalog sync is deliberately bounded per request (app/api/shopify/sync's
// own MAX_PAGES_PER_CALL comment) rather than one long-running job — this
// panel just calls it repeatedly until `done`, refreshing the server-
// rendered dashboard (router.refresh()) once a full pass completes so the
// score/issues/catalog table reflect the fresh scan without a manual reload.
export default function SyncPanel({ initialSyncStatus, hasProducts }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialSyncStatus === "syncing" ? "syncing" : "idle");
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  async function runOnePass() {
    setStatus("syncing");
    setError("");
    try {
      const res = await fetch("/api/shopify/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setStatus("idle");
        setError(data.error || "Sync failed. Please try again.");
        return;
      }
      setProgress({ productsProcessed: data.productsProcessed, done: data.done });
      if (data.done) {
        setStatus("idle");
        router.refresh();
      } else {
        // More pages remain — continue automatically, still bounded per
        // call server-side, so this just chains several short requests
        // instead of one long one.
        runOnePass();
      }
    } catch {
      setStatus("idle");
      setError("Network error — please try again.");
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button type="button" className={styles.btn} onClick={runOnePass} disabled={status === "syncing"}>
        {status === "syncing" ? "Syncing catalog…" : hasProducts ? "Resync catalog" : "Sync catalog"}
      </button>
      {progress && !error && (
        <p className={styles.sectionHint}>
          {progress.done ? "Catalog fully synced." : `Synced ${progress.productsProcessed} products so far…`}
        </p>
      )}
      {error && <div className={styles.errBanner}>{error}</div>}
    </div>
  );
}

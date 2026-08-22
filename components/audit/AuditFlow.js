"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../test/test.module.css";
import AuditResults from "./AuditResults";

export default function AuditFlow({ initialDomain = "" }) {
  const [domain, setDomain] = useState(initialDomain);
  const [phase, setPhase] = useState("setup"); // setup | running | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function runAudit(e) {
    e?.preventDefault();
    if (!domain.trim()) return;
    setPhase("running");
    setError("");
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setPhase("setup");
        return;
      }
      setResult(data);
      setPhase("done");
    } catch {
      setError("Network error — please try again.");
      setPhase("setup");
    }
  }

  function auditAnother() {
    setPhase("setup");
    setResult(null);
    setError("");
  }

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.topNav}>
          <Link href="/" className={styles.logo}>
            stocked<b>by</b>
          </Link>
        </div>
        <div className={styles.mark}>Free website check</div>
        <h1 className={styles.title}>Can AI apps read your website?</h1>
        <p className={styles.sub}>
          If AI can&rsquo;t read your shop, it can&rsquo;t recommend or sell your products. Free
          check, 30 seconds.
        </p>

        {(phase === "setup" || phase === "running") && (
          <form className={styles.card} onSubmit={runAudit}>
            <span className={styles.label}>Your website</span>
            <input
              className={styles.input}
              type="text"
              placeholder="yourbrand.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              autoComplete="url"
              disabled={phase === "running"}
              autoFocus
            />
            <p className={styles.hint} style={{ marginTop: 0 }}>
              We check if AI apps can find, read and buy from your site. No signup.
            </p>
            {error && <div className={styles.errBanner}>{error}</div>}
            <button type="submit" className={styles.btn} disabled={!domain.trim() || phase === "running"}>
              {phase === "running" ? "Checking your website…" : "Check my website — free"}
            </button>
          </form>
        )}

        {phase === "done" && result && (
          <>
            <AuditResults result={result} />
            <button type="button" className={styles.btnGhost} onClick={auditAnother}>
              Check another website
            </button>
          </>
        )}
      </div>
    </div>
  );
}

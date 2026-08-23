"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../test/test.module.css";
import { trackEvent } from "@/lib/analytics";
import FixResults from "./FixResults";

export default function FixFlow({ initialDomain = "" }) {
  const [domain, setDomain] = useState(initialDomain);
  const [phase, setPhase] = useState("setup"); // setup | running | done
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function runFix(e) {
    e?.preventDefault();
    if (!domain.trim()) return;
    setPhase("running");
    setError("");
    trackEvent("fix_started", { domain: domain.trim() });
    try {
      const res = await fetch("/api/fix", {
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
      trackEvent("fix_completed", { domain: data.domain, platform: data.platform });
    } catch {
      setError("Network error — please try again.");
      setPhase("setup");
    }
  }

  function fixAnother() {
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
        <div className={styles.mark}>Fix generator</div>
        <h1 className={styles.title}>Fix your website so AI can read it</h1>
        <p className={styles.sub}>
          We write the exact code your site needs — free, paste-ready, no developer required to
          get started.
        </p>

        {(phase === "setup" || phase === "running") && (
          <form className={styles.card} onSubmit={runFix}>
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
              We read up to 8 product pages and write the code AI apps need to find and understand
              them. No signup.
            </p>
            {error && <div className={styles.errBanner}>{error}</div>}
            <button type="submit" className={styles.btn} disabled={!domain.trim() || phase === "running"}>
              {phase === "running" ? "Reading your product pages…" : "Fix my website — free"}
            </button>
          </form>
        )}

        {phase === "done" && result && (
          <>
            <FixResults result={result} />
            <button type="button" className={styles.btnGhost} onClick={fixAnother}>
              Fix another website
            </button>
          </>
        )}
      </div>
    </div>
  );
}

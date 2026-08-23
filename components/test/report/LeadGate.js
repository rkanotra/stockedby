"use client";

import { useState } from "react";
import styles from "../test.module.css";

// Plain-language DPDP (India) / PDPL (UAE, KSA) consent line — hard rule 8.
const CONSENT_TEXT =
  "I agree StockedBy can email me this report and occasional updates. We store only what's needed to send it, never sell your data, and you can unsubscribe anytime.";

// Email gate (hard rule 8, un-deferred in Phase 4): verdict + engine
// scoreboxes (VerdictCard) render free, everything else — the cards passed
// as `children` — sits behind this. Presentational only: children are
// already fully in the DOM (just blurred + height-clipped) rather than
// server-redacted, since the gate's job is lead capture, not access
// control — see app/api/test/route.js's save-report comment.
export default function LeadGate({ market, category, brand, brandWebsite, verdict, slug, onUnlock, children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(brandWebsite || "");
  const [pain, setPain] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !consent || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          brand,
          brandWebsite: website.trim(),
          painpoint: pain.trim(),
          market,
          category,
          consent,
          verdict,
          reportSlug: slug || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      // Graceful on the server (hard rule 8: unlock even if Resend/Supabase
      // failed) — a 2xx here always means unlock, regardless of what
      // emailResult/persistence sub-flags came back.
      setUnlocked(true);
      onUnlock?.();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className={styles.gateWrap}>
      <div className={styles.gatePreview} aria-hidden="true">
        {children}
      </div>
      <form className={`${styles.card} ${styles.gateForm}`} onSubmit={handleSubmit}>
        <div className={styles.h2}>See the full report</div>
        <p className={styles.sectionHint}>
          Checkout routing, Share of AI Voice, sentiment, the shelves, query fanout and trusted
          sources — free, just tell us where to send it.
        </p>
        <input
          className={styles.input}
          type="email"
          placeholder="Work email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <input
          className={styles.input}
          type="text"
          placeholder="Brand website (optional) — e.g. yourbrand.com"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          autoComplete="url"
        />
        <textarea
          className={styles.qedit}
          style={{ marginBottom: 12 }}
          placeholder="Your biggest pain point selling online (optional)"
          rows={3}
          value={pain}
          onChange={(e) => setPain(e.target.value)}
        />
        <label className={styles.consentRow}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span>{CONSENT_TEXT}</span>
        </label>
        {error && <div className={styles.errBanner}>{error}</div>}
        <button type="submit" className={styles.btn} disabled={!email.trim() || !consent || submitting}>
          {submitting ? "Unlocking…" : "Unlock full report — free"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../test/test.module.css";
import { trackEvent } from "@/lib/analytics";

const CONSENT_TEXT =
  "I agree StockedBy can email me this fix and occasional updates. We store only what's needed to send it, never sell your data, and you can unsubscribe anytime.";

// Domain-keyed twin of components/test/report/LeadGate.js (hard rule 8's
// gate, extended to source="fix" per the Fix Generator spec's "same email
// gate as reports"). No market/category/brand to collect — the domain is
// already known — so this is a smaller form than the report gate, but the
// same presentational blur/clip-then-unlock shape.
export default function FixLeadGate({ domain, platform, children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [pain, setPain] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackEvent("fix_gate_shown", { domain });
  }, [domain]);

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
          brandWebsite: domain,
          painpoint: pain.trim(),
          consent,
          source: "fix",
          platform,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      trackEvent("fix_lead_submitted", { domain });
      setUnlocked(true);
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
        <div className={styles.h2}>Get the full fix</div>
        <p className={styles.sectionHint}>
          Every product page&rsquo;s code, plus your llms.txt file and install steps — free, just
          tell us where to send it.
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
        <textarea
          className={styles.qedit}
          style={{ marginBottom: 12 }}
          placeholder="Anything you're stuck on? (optional)"
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
          {submitting ? "Unlocking…" : "Unlock the full fix — free"}
        </button>
      </form>
    </div>
  );
}

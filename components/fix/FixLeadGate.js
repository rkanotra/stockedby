"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../test/test.module.css";
import { trackEvent } from "@/lib/analytics";
import { isValidEmailFormat, isDisposableEmail, isFreeProvider, suggestEmailCorrection } from "@/lib/emailValidation";

// Required (DPDP/PDPL data-processing consent) and optional (marketing)
// are two DISTINCT checkboxes now — CLAUDE.md's redesign phase: bundling
// them meant getting the fix required agreeing to marketing updates too.
// The required one covers only what's needed to send the fix.
const CONSENT_TEXT = "I agree StockedBy can process my details to send me this fix.";
const MARKETING_TEXT = "Also send me occasional product updates. You can unsubscribe anytime.";

// Domain-keyed twin of components/test/report/LeadGate.js (hard rule 8's
// gate, extended to source="fix" per the Fix Generator spec's "same email
// gate as reports"). No market/category/brand to collect — the domain is
// already known — so this is a smaller form than the report gate, but the
// same presentational blur/clip-then-unlock shape.
export default function FixLeadGate({ domain, platform, onUnlock, children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [pain, setPain] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [suggestion, setSuggestion] = useState(null);
  const shown = useRef(false);

  function handleEmailBlur() {
    const trimmed = email.trim();
    setSuggestion(null);
    if (!trimmed) {
      setEmailError("");
      return;
    }
    if (!isValidEmailFormat(trimmed)) {
      setEmailError("That doesn't look like a valid email address.");
      return;
    }
    if (isDisposableEmail(trimmed)) {
      setEmailError("Please use an email you check.");
      return;
    }
    setEmailError("");
    const suggested = suggestEmailCorrection(trimmed);
    if (suggested) setSuggestion(suggested);
  }

  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    trackEvent("fix_gate_shown", { domain });
  }, [domain]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !consent || submitting) return;
    if (!isValidEmailFormat(trimmed)) {
      setEmailError("That doesn't look like a valid email address.");
      return;
    }
    if (isDisposableEmail(trimmed)) {
      setEmailError("Please use an email you check.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          brandWebsite: domain,
          painpoint: pain.trim(),
          consent,
          source: "fix",
          platform,
          isFreeProvider: isFreeProvider(trimmed),
          marketingOptIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      trackEvent("fix_lead_submitted", { domain });
      setUnlocked(true);
      onUnlock?.(trimmed);
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
          className={`${styles.input} ${styles.inputRequired}`}
          type="email"
          placeholder="Work email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError("");
            setSuggestion(null);
          }}
          onBlur={handleEmailBlur}
          autoComplete="email"
        />
        {emailError && <div className={styles.fieldError}>{emailError}</div>}
        {suggestion && !emailError && (
          <div className={styles.fieldSuggestion}>
            <span>Did you mean {suggestion}?</span>
            <button type="button" onClick={() => { setEmail(suggestion); setSuggestion(null); }}>
              Use this
            </button>
            <button type="button" className={styles.fieldSuggestionDismiss} onClick={() => setSuggestion(null)}>
              Dismiss
            </button>
          </div>
        )}
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
        <label className={styles.consentRow}>
          <input
            type="checkbox"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
          />
          <span>{MARKETING_TEXT}</span>
        </label>
        {error && <div className={styles.errBanner}>{error}</div>}
        <button
          type="submit"
          className={styles.btn}
          disabled={!email.trim() || !consent || submitting || Boolean(emailError)}
        >
          {submitting ? "Sending…" : "Get the full fix — free"}
        </button>
      </form>
    </div>
  );
}

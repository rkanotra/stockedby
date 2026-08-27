"use client";

import { useState } from "react";
import styles from "../test.module.css";
import GateModal from "./GateModal";

// Plain-language DPDP (India) / PDPL (UAE, KSA) consent line — hard rule 8.
const CONSENT_TEXT =
  "I agree StockedBy can email me this report and occasional updates. We store only what's needed to send it, never sell your data, and you can unsubscribe anytime.";

// Email gate (hard rule 8, un-deferred in Phase 4): verdict + engine
// scoreboxes (VerdictCard) render free, everything else — the cards passed
// as `children` — sits behind this. Opens as GateModal.js the instant this
// mounts unlocked (i.e. the moment "See full report" is clicked) — no
// blurred-teaser-in-document-flow to scroll past (that read as "nothing
// happened" when the button was near the bottom of the viewport). Closing
// the modal without submitting leaves a small "Unlock full report" button
// in its place, not a dead end.
export default function LeadGate({
  market,
  category,
  brand,
  brandWebsite,
  verdict,
  slug,
  onUnlock,
  report,
  engines,
  sentiment,
  trustedSources,
  competitor,
  mentionCount,
  children,
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [modalOpen, setModalOpen] = useState(true);
  const [email, setEmail] = useState("");
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
          brandWebsite: brandWebsite || "",
          // The domain this test actually ran on — read-only in this form
          // now (it can't change the completed test), so this and
          // brandWebsite above are always the same value; kept as its own
          // field for app/api/lead/route.js's own clarity/back-compat.
          testedDomain: brandWebsite || "",
          painpoint: pain.trim(),
          market,
          category,
          consent,
          verdict,
          reportSlug: slug || null,
          // The client already has this report's real data in memory —
          // sending it directly means the merchant email (and its PDF) can
          // always be built, instead of depending on a Supabase round trip
          // (getReportBySlug) that fails silently if persistence didn't
          // happen or hasn't caught up yet. See app/api/lead/route.js.
          report,
          engines,
          sentiment,
          trustedSources,
          competitor,
          mentionCount,
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
      setModalOpen(false);
      onUnlock?.();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (unlocked) return <>{children}</>;

  const form = (
    <form className={styles.gateForm} onSubmit={handleSubmit}>
      <div className={styles.h2}>See the full report</div>
      <p className={styles.sectionHint}>
        See which brands AI recommends instead, where it sends buyers to pay, and what to fix
        first.
      </p>
      <input
        className={styles.input}
        type="email"
        placeholder="Work email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        autoFocus
      />
      <input
        className={styles.input}
        type="text"
        value={brandWebsite || ""}
        readOnly
        aria-label="Brand website (from your test, can't be changed)"
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
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required />
        <span>{CONSENT_TEXT}</span>
      </label>
      {error && <div className={styles.errBanner}>{error}</div>}
      <button type="submit" className={styles.btn} disabled={!email.trim() || !consent || submitting}>
        {submitting ? "Unlocking…" : "Unlock full report — free"}
      </button>
    </form>
  );

  return (
    <>
      {modalOpen && <GateModal onClose={() => setModalOpen(false)}>{form}</GateModal>}
      {!modalOpen && (
        <button type="button" className={styles.btnGhost} onClick={() => setModalOpen(true)}>
          Unlock full report — free
        </button>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import { buildAuditLayerOne } from "@/lib/audit/layerOne";
import { getInstallInstructions, schemaHonestNote } from "@/lib/audit/installInstructions";
import { platformLabel, PICKER_PLATFORMS } from "@/lib/audit/platform";
import { isValidEmailFormat } from "@/lib/emailValidation";
import styles from "../test/test.module.css";
import ProductJsonLdCard from "./ProductJsonLdCard";
import FixLeadGate from "./FixLeadGate";

// Same mapping as components/audit/AuditResults.js — vBlocked (not the
// shared, neutral vBad) for the blocked case, so the before/after diff
// still reads clearly bad-to-good without inventing a third colour scheme.
const PLAIN_VERDICT_CLASS = {
  "YES, AI CAN READ YOUR SHOP": "vGood",
  "AI CAN READ YOUR SHOP, BUT NOT YOUR PRODUCTS": "vMid",
  "AI CAN'T READ YOUR SHOP": "vBlocked",
};

function downloadLlmsTxt(text) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "llms.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Collapsed by default — a non-technical owner shouldn't have to scroll
// past a wall of steps just to see there IS a plain-language path forward;
// they expand it (or forward the page) when they're ready to actually do it.
function StepList({ title, steps }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 10 }}>
      <div className={styles.codeBlockHead}>
        <span className={styles.sectionHint} style={{ margin: 0 }}>
          {title}
        </span>
        <button type="button" className={styles.copyBtn} onClick={() => setOpen((v) => !v)}>
          {open ? "Hide steps" : "Show steps"}
        </button>
      </div>
      {open &&
        steps.map((step, i) => (
          <div className={styles.installStep} key={i}>
            <span className={styles.installStepNum}>{i + 1}</span>
            <span>{step}</span>
          </div>
        ))}
    </div>
  );
}

// "Not comfortable editing your website?" escape hatch (spec item 3) — kept
// ungated and prominent (right after the plain-language explainer, before
// any code) since a non-technical owner shouldn't have to unlock anything
// just to learn a developer can handle this instead. There's no persisted
// /fix share link yet (unlike /report/[slug]) — copying the current page
// URL is the best available "send this to someone" today; it re-fills the
// domain so a developer opening it can pick up from there.
function EscapeHatchCard() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard permission denied — the URL is still visible in the address bar
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.h2}>Not comfortable editing your website?</div>
      <p className={styles.sectionHint} style={{ marginBottom: 14 }}>
        Two options: forward this page to your web developer, or reply to your report email and
        we&rsquo;ll install it for you.
      </p>
      <button type="button" className={styles.btnGhost} onClick={copyLink} style={{ marginTop: 0 }}>
        {copied ? "Link copied" : "Copy link to send"}
      </button>
    </div>
  );
}

// Shown only when detectPlatform() couldn't identify the platform (spec
// item 6: "if we can't detect it, show a short platform picker") — lets a
// merchant self-report so the install steps below aren't stuck on the
// generic fallback. Never shown for a platform we already detected.
function PlatformPicker({ selected, onSelect }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>Which platform is your website on?</span>
      <p className={styles.sectionHint} style={{ marginTop: 0, marginBottom: 12 }}>
        We couldn&rsquo;t auto-detect it — pick one for exact install steps.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {PICKER_PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={styles.btnGhost}
            style={{
              width: "auto",
              padding: "8px 14px",
              marginTop: 0,
              ...(selected !== p.id ? { borderColor: "var(--border-strong)", color: "var(--text-muted)" } : {}),
            }}
            onClick={() => onSelect(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// "Send this to my developer" (spec item 6) — a real email action,
// distinct from EscapeHatchCard's "copy this page's link" above. Only
// rendered once the merchant has unlocked (we already have their own
// email from FixLeadGate by then) and sends the ALREADY-generated
// products/llmsTxt straight from this component's own state — the
// developer's address is logged alongside the merchant's, never
// substituted for it.
function DeveloperSendCard({ domain, platform, products, llmsTxt, merchantEmail }) {
  const [devEmail, setDevEmail] = useState("");
  const [devEmailError, setDevEmailError] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function send(e) {
    e.preventDefault();
    const trimmed = devEmail.trim();
    if (!trimmed || sending) return;
    if (!isValidEmailFormat(trimmed)) {
      setDevEmailError("That doesn't look like a valid email address.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/fix/send-to-developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, platform, developerEmail: trimmed, merchantEmail, products, llmsTxt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.card}>
      <span className={styles.label}>Send this to my developer</span>
      <p className={styles.sectionHint} style={{ marginTop: 0, marginBottom: 12 }}>
        We&rsquo;ll email them every product&rsquo;s code, llms.txt, and the install steps above.
      </p>
      {sent ? (
        <p className={styles.storyLine}>Sent — check with them once it&rsquo;s installed.</p>
      ) : (
        <form onSubmit={send}>
          <input
            className={`${styles.input} ${styles.inputRequired}`}
            type="email"
            placeholder="Developer's email"
            value={devEmail}
            onChange={(e) => {
              setDevEmail(e.target.value);
              setDevEmailError("");
            }}
            autoComplete="email"
          />
          {devEmailError && <div className={styles.fieldError}>{devEmailError}</div>}
          {error && <div className={styles.errBanner}>{error}</div>}
          <button type="submit" className={styles.btn} disabled={!devEmail.trim() || sending}>
            {sending ? "Sending…" : "Send to my developer"}
          </button>
        </form>
      )}
    </div>
  );
}

// First 2 products render free and unlocked (spec item 6); the full set —
// every product plus llms.txt, install steps and the verify step — sits
// behind FixLeadGate's same blur/unlock pattern LeadGate.js uses for
// reports (hard rule 8, source="fix"). The explainer and escape hatch stay
// ungated (below) — plain-language framing and "get a developer" is free
// for everyone, not held behind the email gate.
export default function FixResults({ result }) {
  const { domain, platform, products, llmsTxt, auditBefore } = result;
  const doneCount = products.filter((p) => p.status === "done").length;
  const freeProducts = products.slice(0, 2);

  const [verifying, setVerifying] = useState(false);
  const [after, setAfter] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [merchantEmail, setMerchantEmail] = useState(null);
  // Only meaningful when platform === "custom" (detection failed) — see
  // PlatformPicker above. Left null otherwise so a detected platform is
  // never second-guessed by a stray selection.
  const [pickedPlatform, setPickedPlatform] = useState(null);
  const effectivePlatform = platform === "custom" && pickedPlatform ? pickedPlatform : platform;
  const install = getInstallInstructions(effectivePlatform);
  const honestNote = schemaHonestNote(auditBefore, effectivePlatform);

  async function verify() {
    setVerifying(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setAfter(data);
    } catch {
      setVerifyError("Network error — please try again.");
    } finally {
      setVerifying(false);
    }
  }

  const beforeLayer1 = auditBefore ? buildAuditLayerOne(auditBefore) : null;
  const afterLayer1 = after ? buildAuditLayerOne(after) : null;

  return (
    <>
      <div className={styles.card}>
        <span className={styles.platformBadge}>
          {domain} · {platformLabel(platform)}
        </span>
        <p className={styles.storyLine} style={{ marginTop: 8 }}>
          {doneCount > 0
            ? `We read ${doneCount} of ${products.length} product page${products.length === 1 ? "" : "s"} and wrote the code AI apps need.`
            : "We checked your product pages, but couldn't read any of them as real products."}
        </p>
      </div>

      <div className={styles.card}>
        <span className={styles.label}>What is this?</span>
        <p className={styles.storyLine} style={{ marginTop: 0 }}>
          An invisible label for your product that AI apps read — name, price, in stock. Shoppers
          never see it. It cannot break your website.
        </p>
      </div>

      <EscapeHatchCard />

      {platform === "custom" && <PlatformPicker selected={pickedPlatform} onSelect={setPickedPlatform} />}

      {freeProducts.map((p) => (
        <ProductJsonLdCard key={p.url} result={p} />
      ))}

      <FixLeadGate domain={domain} platform={platform} onUnlock={setMerchantEmail}>
        {products.map((p) => (
          <ProductJsonLdCard key={`full-${p.url}`} result={p} />
        ))}

        <div className={styles.card}>
          <span className={styles.label}>llms.txt</span>
          <p className={styles.sectionHint} style={{ marginTop: 0 }}>
            A short, AI-readable summary of your shop and its products.
          </p>
          <button type="button" className={styles.btn} onClick={() => downloadLlmsTxt(llmsTxt)}>
            Download llms.txt
          </button>
        </div>

        <div className={styles.card}>
          <span className={styles.label}>How to install it — {install.label}</span>
          {honestNote && (
            <p className={styles.customNote} style={{ marginTop: 0 }}>
              {honestNote}
            </p>
          )}
          <StepList title="Product code" steps={install.productJsonLd} />
          <StepList title="llms.txt" steps={install.llmsTxt} />
        </div>

        <DeveloperSendCard
          domain={domain}
          platform={effectivePlatform}
          products={products}
          llmsTxt={llmsTxt}
          merchantEmail={merchantEmail}
        />

        <div className={styles.card}>
          <span className={styles.label}>Verify it worked</span>
          <p className={styles.sectionHint} style={{ marginTop: 0 }}>
            Once it&rsquo;s live on your site, re-check it and see what changed.
          </p>
          {verifyError && <div className={styles.errBanner}>{verifyError}</div>}
          <button type="button" className={styles.btn} onClick={verify} disabled={verifying}>
            {verifying ? "Checking…" : "Verify it worked"}
          </button>
          {beforeLayer1 && afterLayer1 && (
            <div className={styles.verifyGrid}>
              <div className={styles.verifyCol}>
                <span className={styles.verifyColLabel}>Before</span>
                <div style={{ fontWeight: 700, fontSize: 13 }} className={styles[PLAIN_VERDICT_CLASS[beforeLayer1.verdict]] || ""}>
                  {beforeLayer1.verdict}
                </div>
              </div>
              <div className={styles.verifyCol}>
                <span className={styles.verifyColLabel}>After</span>
                <div style={{ fontWeight: 700, fontSize: 13 }} className={styles[PLAIN_VERDICT_CLASS[afterLayer1.verdict]] || ""}>
                  {afterLayer1.verdict}
                </div>
              </div>
            </div>
          )}
        </div>
      </FixLeadGate>
    </>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { buildAuditJourney } from "@/lib/audit/journey";
import { getInstallInstructions, schemaHonestNote } from "@/lib/audit/installInstructions";
import { platformLabel, PICKER_PLATFORMS } from "@/lib/audit/platform";
import { buildReusableSnippet, REUSABLE_TEMPLATE_PLATFORMS } from "@/lib/audit/fixGenerator";
import { isValidEmailFormat } from "@/lib/emailValidation";
import styles from "../test/test.module.css";
import ProductJsonLdCard from "./ProductJsonLdCard";
import FixLeadGate from "./FixLeadGate";
import FixPlan from "./FixPlan";
import InstallationMode from "./InstallationMode";

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
// they expand it when they're ready to actually do it.
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

// One reusable template instead of N per-product code blocks (Shopify/
// WooCommerce only — lib/audit/fixGenerator.js's buildReusableSnippet;
// every other platform keeps the per-product static JSON-LD flow below).
function ReusableSnippetCard({ platform }) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const snippet = buildReusableSnippet(platform);
  if (!snippet) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard permission denied — still selectable by hand
    }
  }

  return (
    <div className={styles.card}>
      <span className={styles.label}>One paste-once template — {platformLabel(platform)}</span>
      <p className={styles.storyLine} style={{ marginTop: 0, marginBottom: 12 }}>
        This reads each product page&rsquo;s own name, price and availability automatically — paste
        it once in your product template, not once per product.
      </p>
      <div className={styles.codeBlockHead}>
        <span className={styles.sectionHint} style={{ margin: 0 }}>
          Reusable template
        </span>
        <button type="button" className={styles.copyBtn} onClick={() => setShowCode((v) => !v)}>
          {showCode ? "Hide code" : "View code"}
        </button>
      </div>
      {showCode && (
        <>
          <pre className={styles.codeBlock}>{snippet}</pre>
          <button type="button" className={styles.copyBtn} style={{ marginTop: 8 }} onClick={copy}>
            {copied ? "Copied" : "Copy code"}
          </button>
        </>
      )}
    </div>
  );
}

// Shown only when detectPlatform() couldn't identify the platform — lets
// a merchant self-report so the install steps below aren't stuck on the
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

// A real email action — sends the ALREADY-generated products/llmsTxt
// straight from this component's own state — the developer's address is
// logged alongside the merchant's, never substituted for it.
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
      <div className={styles.h2}>Send this to your developer</div>
      <p className={styles.sectionHint} style={{ marginTop: 0, marginBottom: 12 }}>
        We&rsquo;ll send the issue summary, exact code and installation steps.
      </p>
      {sent ? (
        <p className={styles.storyLine}>Sent — your developer has everything needed to implement this fix.</p>
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
            {sending ? "Sending…" : "Send fix package →"}
          </button>
        </form>
      )}
    </div>
  );
}

// Founder-first redesign (CLAUDE.md's redesign phase): the fix plan
// (what's wrong, what to do first) comes BEFORE any code; the merchant
// picks how they want to install it once (InstallationMode) instead of
// every action competing for attention; code is collapsed by default
// (ProductJsonLdCard); Shopify/WooCommerce get one reusable template
// instead of N per-product blocks. First 2 products still render free —
// the rest sit behind FixLeadGate's same gate LeadGate.js uses for
// reports (hard rule 8, source="fix").
export default function FixResults({ result }) {
  const { domain, platform, products, llmsTxt, auditBefore } = result;
  const doneCount = products.filter((p) => p.status === "done").length;
  const alreadyGoodCount = products.filter((p) => p.status === "already-good").length;
  const freeProducts = products.slice(0, 2);

  const [verifying, setVerifying] = useState(false);
  const [after, setAfter] = useState(null);
  const [verifyError, setVerifyError] = useState("");
  const [merchantEmail, setMerchantEmail] = useState(null);
  const [installMode, setInstallMode] = useState("self");
  // Only meaningful when platform === "custom" (detection failed) — see
  // PlatformPicker above. Left null otherwise so a detected platform is
  // never second-guessed by a stray selection.
  const [pickedPlatform, setPickedPlatform] = useState(null);
  const effectivePlatform = platform === "custom" && pickedPlatform ? pickedPlatform : platform;
  const install = getInstallInstructions(effectivePlatform);
  const honestNote = schemaHonestNote(auditBefore, effectivePlatform);
  const usesReusableTemplate = REUSABLE_TEMPLATE_PLATFORMS.has(effectivePlatform);

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

  const beforeJourney = auditBefore ? buildAuditJourney(auditBefore) : null;
  const afterJourney = after ? buildAuditJourney(after) : null;

  return (
    <>
      <div className={styles.card}>
        <span className={styles.platformBadge}>
          {domain} · {platformLabel(platform)}
        </span>
        <p className={styles.storyLine} style={{ marginTop: 8 }}>
          {doneCount + alreadyGoodCount > 0
            ? `We checked ${products.length} product page${products.length === 1 ? "" : "s"}${
                alreadyGoodCount > 0 ? ` — ${alreadyGoodCount} already had complete data` : ""
              }.`
            : "We checked your product pages, but couldn't read any of them as real products."}
        </p>
      </div>

      <FixPlan needsProductFix={doneCount} totalProducts={products.length} hasLlmsTxt={Boolean(llmsTxt)} />

      <div className={styles.card}>
        <span className={styles.label}>What we&rsquo;re adding</span>
        <p className={styles.storyLine} style={{ marginTop: 0 }}>
          Structured product information — this gives machines a consistent description of your
          product, including its name, price, availability and brand. It doesn&rsquo;t change what
          shoppers see when installed correctly.
        </p>
      </div>

      {platform === "custom" && <PlatformPicker selected={pickedPlatform} onSelect={setPickedPlatform} />}

      {freeProducts.map((p) => (
        <ProductJsonLdCard key={p.url} result={p} hideCode={usesReusableTemplate} />
      ))}

      <FixLeadGate domain={domain} platform={platform} onUnlock={setMerchantEmail}>
        <InstallationMode mode={installMode} onChange={setInstallMode} />

        {installMode === "developer" ? (
          <DeveloperSendCard
            domain={domain}
            platform={effectivePlatform}
            products={products}
            llmsTxt={llmsTxt}
            merchantEmail={merchantEmail}
          />
        ) : (
          <>
            {usesReusableTemplate && <ReusableSnippetCard platform={effectivePlatform} />}

            {products.map((p) => (
              <ProductJsonLdCard key={`full-${p.url}`} result={p} hideCode={usesReusableTemplate} />
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
              {!usesReusableTemplate && <StepList title="Product code" steps={install.productJsonLd} />}
              <StepList title="llms.txt" steps={install.llmsTxt} />
            </div>
          </>
        )}

        <div className={styles.card}>
          <span className={styles.label}>Check my changes</span>
          <p className={styles.sectionHint} style={{ marginTop: 0 }}>
            Once it&rsquo;s live on your site, re-check it and see what changed.
          </p>
          {verifyError && <div className={styles.errBanner}>{verifyError}</div>}
          <button type="button" className={styles.btn} onClick={verify} disabled={verifying}>
            {verifying ? "Checking…" : "Check my changes"}
          </button>
          {beforeJourney && afterJourney && (
            <>
              {beforeJourney.stages.some(
                (before, i) => before.status !== "Ready" && afterJourney.stages[i]?.status === "Ready"
              ) && <div className={styles.h2}>Technical blocker removed.</div>}
              <div className={styles.verifyGrid}>
                <div className={styles.verifyCol}>
                  <span className={styles.verifyColLabel}>Before</span>
                  {beforeJourney.stages.map((s) => (
                    <div key={s.key} className={styles.sovrow}>
                      <span>{s.label}</span>
                      <span className={styles.p}>{s.status}</span>
                    </div>
                  ))}
                </div>
                <div className={styles.verifyCol}>
                  <span className={styles.verifyColLabel}>After</span>
                  {afterJourney.stages.map((s) => (
                    <div key={s.key} className={styles.sovrow}>
                      <span>{s.label}</span>
                      <span className={styles.p}>{s.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/test" className={styles.plainLink}>
                Check whether AI recommends my brand →
              </Link>
            </>
          )}
        </div>
      </FixLeadGate>
    </>
  );
}

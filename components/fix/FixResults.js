"use client";

import { useState } from "react";
import { buildAuditLayerOne } from "@/lib/audit/layerOne";
import { getInstallInstructions } from "@/lib/audit/installInstructions";
import { platformLabel } from "@/lib/audit/platform";
import styles from "../test/test.module.css";
import ProductJsonLdCard from "./ProductJsonLdCard";
import FixLeadGate from "./FixLeadGate";

const PLAIN_VERDICT_CLASS = {
  "YES, AI CAN READ YOUR SHOP": "vGood",
  "SOME PROBLEMS": "vMid",
  "AI CAN'T READ YOUR SHOP": "vBad",
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

// First 2 products render free and unlocked (spec item 6); the full set —
// every product plus llms.txt, install steps and the verify step — sits
// behind FixLeadGate's same blur/unlock pattern LeadGate.js uses for
// reports (hard rule 8, source="fix").
export default function FixResults({ result }) {
  const { domain, platform, products, llmsTxt, auditBefore } = result;
  const doneCount = products.filter((p) => p.status === "done").length;
  const freeProducts = products.slice(0, 2);
  const install = getInstallInstructions(platform);

  const [verifying, setVerifying] = useState(false);
  const [after, setAfter] = useState(null);
  const [verifyError, setVerifyError] = useState("");

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

      {freeProducts.map((p) => (
        <ProductJsonLdCard key={p.url} result={p} />
      ))}

      <FixLeadGate domain={domain} platform={platform}>
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
          <p className={styles.sectionHint} style={{ marginTop: 0 }}>
            Product code:
          </p>
          {install.productJsonLd.map((step, i) => (
            <div className={styles.installStep} key={`p-${i}`}>
              <span className={styles.installStepNum}>{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
          <p className={styles.sectionHint}>llms.txt:</p>
          {install.llmsTxt.map((step, i) => (
            <div className={styles.installStep} key={`l-${i}`}>
              <span className={styles.installStepNum}>{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

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

        <div className={styles.card}>
          <p className={styles.storyLine} style={{ marginTop: 0 }}>
            Don&rsquo;t have a developer? Reply to your email — we&rsquo;ll install it for you.
          </p>
        </div>
      </FixLeadGate>
    </>
  );
}

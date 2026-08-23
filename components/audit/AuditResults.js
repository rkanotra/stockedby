"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../test/test.module.css";
import { platformLabel } from "@/lib/audit/platform";
import { buildAuditLayerOne } from "@/lib/audit/layerOne";
import LayerCard from "./LayerCard";

const VERDICT_CLASS = {
  "AGENT-READY": "vGood",
  "PARTIALLY READY": "vMid",
  "INVISIBLE TO AGENTS": "vBad",
};
const PLAIN_VERDICT_CLASS = {
  "YES, AI CAN READ YOUR SHOP": "vGood",
  "SOME PROBLEMS": "vMid",
  "AI CAN'T READ YOUR SHOP": "vBad",
};

const VERDICT_SUBTITLE = {
  "AGENT-READY": "Agents can find you, understand your products, and complete a purchase.",
  "PARTIALLY READY": "Agents can reach parts of your store, but gaps below will lose sales.",
  "INVISIBLE TO AGENTS": "Agents likely can't even discover your store yet — start with the checks below.",
};

// Layer 1 (always visible, plain language — no robots.txt/llms.txt/UCP/
// ACP/JSON-LD here, see lib/audit/layerOne.js) is the default view. "See
// technical details" reveals Layer 2, which is exactly the audit's
// original per-check output — unchanged, same three LayerCards, same
// technical vocabulary, meant for developers.
export default function AuditResults({ result }) {
  const [showFull, setShowFull] = useState(false);
  const { domain, platform, verdict, layers } = result;
  const layer1 = buildAuditLayerOne(result);

  return (
    <>
      <div className={styles.card}>
        <span className={styles.label}>Can AI apps read your shop?</span>
        <div className={`${styles.storyBig} ${styles[PLAIN_VERDICT_CLASS[layer1.verdict]] || ""}`}>
          {layer1.verdict}
        </div>
      </div>

      {layer1.findings.length === 0 ? (
        <div className={styles.card}>
          <p className={styles.storyLine}>No problems found — AI apps can read your shop.</p>
        </div>
      ) : (
        <>
          <div className={styles.card}>
            <span className={styles.label}>What&rsquo;s wrong</span>
            <ul className={styles.storyActions}>
              {layer1.findings.map((f, i) => (
                <li key={i}>
                  {f.finding} — {f.fix}
                </li>
              ))}
            </ul>
          </div>
          <Link
            href={`/fix?domain=${encodeURIComponent(domain)}`}
            className={styles.btn}
            style={{ display: "block", textAlign: "center" }}
          >
            Generate the fix →
          </Link>
        </>
      )}

      {!showFull && (
        <button type="button" className={styles.btn} onClick={() => setShowFull(true)}>
          See technical details
        </button>
      )}

      {showFull && (
        <>
          <div className={styles.card}>
            <span className={styles.platformBadge}>
              {domain} · {platformLabel(platform)}
            </span>
            <div className={`${styles.verdict} ${styles[VERDICT_CLASS[verdict]] || ""}`}>{verdict}</div>
            <div className={styles.subline}>{VERDICT_SUBTITLE[verdict] || ""}</div>
          </div>

          <LayerCard
            title="Discoverable"
            hint="Can AI agents even crawl your site — robots.txt and a dedicated AI summary file."
            layer={layers.discoverable}
          />
          <LayerCard
            title="Readable"
            hint="Can agents understand what you sell — structured product data, not just pretty HTML."
            layer={layers.readable}
          />
          <LayerCard
            title="Transactable"
            hint="Can an agent actually complete a purchase — agentic checkout manifests and payment infrastructure."
            layer={layers.transactable}
          />
        </>
      )}

      <Link href="/test" className={styles.btnGhost} style={{ display: "block", textAlign: "center", marginTop: 14 }}>
        Now see if AI recommends you → Check my brand
      </Link>
    </>
  );
}

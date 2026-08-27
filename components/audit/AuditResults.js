"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../test/test.module.css";
import { platformLabel } from "@/lib/audit/platform";
import { buildAuditLayerOne } from "@/lib/audit/layerOne";
import { buildAuditJourney, buildCrawlerSummary } from "@/lib/audit/journey";
import LayerCard from "./LayerCard";
import AuditJourney from "./AuditJourney";
import AuditFindings from "./AuditFindings";
import CrawlerSummary from "./CrawlerSummary";
import AuditActionPlan from "./AuditActionPlan";

const VERDICT_CLASS = {
  "AGENT-READY": "vGood",
  "PARTIALLY READY": "vMid",
  "INVISIBLE TO AGENTS": "vBad",
};

const VERDICT_SUBTITLE = {
  "AGENT-READY": "Agents can find you, understand your products, and complete a purchase.",
  "PARTIALLY READY": "Agents can reach parts of your store, but gaps below will lose sales.",
  "INVISIBLE TO AGENTS": "Agents likely can't even discover your store yet — start with the checks below.",
};

// Founder-first redesign (CLAUDE.md's redesign phase): "Is my store
// technically ready for AI?" answered with one dynamic headline
// (lib/audit/journey.js's buildAuditJourney — never a fixed "AI CAN'T
// READ YOUR SHOP" string unless that's genuinely true), the Find ->
// Understand -> Buy signature visual (status word carries the severity
// colour now, not a giant coloured headline), business-impact-structured
// findings, a grouped crawler summary, and a Fix first / Then / Later
// action plan. Full per-check technical detail (LayerCard.js, unchanged)
// stays behind "See technical details" — developers still get everything,
// it's just no longer the default view.
export default function AuditResults({ result }) {
  const [showFull, setShowFull] = useState(false);
  const { domain, platform, verdict, layers, checks } = result;
  const layer1 = buildAuditLayerOne(result);
  const journey = buildAuditJourney(result);
  const crawlerSummary = buildCrawlerSummary(checks);

  return (
    <>
      <span className={styles.founderEyebrow}>{domain}</span>
      <h1 className={styles.founderHeadline}>{journey.headline}</h1>

      <AuditJourney journey={journey} />

      <AuditFindings findings={layer1.findings} />

      {crawlerSummary.restricted.length > 0 && <CrawlerSummary summary={crawlerSummary} />}

      {layer1.findings.length > 0 && (
        <Link
          href={`/fix?domain=${encodeURIComponent(domain)}`}
          className={styles.btn}
          style={{ display: "block", textAlign: "center" }}
        >
          Generate the fix →
        </Link>
      )}

      {layer1.findings.length > 0 && <AuditActionPlan findings={layer1.findings} domain={domain} />}

      <button
        type="button"
        className={styles.disclosureToggle}
        onClick={() => setShowFull((v) => !v)}
        aria-expanded={showFull}
      >
        {showFull ? "Hide technical details" : "See technical details"}
      </button>

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
            hint="Can an agent actually complete a purchase — agentic checkout manifests and payment infrastructure. Emerging infrastructure, not a current standard."
            layer={layers.transactable}
          />
        </>
      )}

      <div className={styles.card} style={{ marginTop: 14 }}>
        <div className={styles.h2}>Technical readiness is only half the picture.</div>
        <p className={styles.sectionHint} style={{ marginBottom: 14 }}>
          Now see whether AI actually recommends your brand.
        </p>
        <Link href="/test" className={styles.btnGhost} style={{ display: "block", textAlign: "center" }}>
          Check my brand — free
        </Link>
      </div>
    </>
  );
}

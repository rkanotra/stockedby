"use client";

import styles from "../test/test.module.css";
import { platformLabel } from "@/lib/audit/platform";
import LayerCard from "./LayerCard";

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

export default function AuditResults({ result }) {
  const { domain, platform, verdict, layers } = result;

  return (
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
  );
}

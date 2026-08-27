"use client";

import Link from "next/link";
import styles from "../test/test.module.css";

// "Fix first / Then / Later" — up to 2 real findings by tier, plus a
// constant, always-future-ready third item (agentic checkout is emerging
// infrastructure, not a current standard — CLAUDE.md's redesign phase,
// brief sections 38-39 and 61). Never invents a fix-first item when
// nothing failed.
export default function AuditActionPlan({ findings, domain }) {
  const fixFirst = (findings || []).find((f) => f.tier === "fix-first");
  const then = (findings || []).find((f) => f.tier === "then");
  const fixHref = `/fix?domain=${encodeURIComponent(domain)}`;

  return (
    <div className={styles.card}>
      <div className={styles.h2}>Your AI readiness plan</div>
      {fixFirst && (
        <div className={styles.impactBlock}>
          <span className={styles.impactBlockLabel}>Fix first</span>
          <span className={styles.impactBlockText}>{fixFirst.fix}</span>
        </div>
      )}
      {then && (
        <div className={styles.impactBlock}>
          <span className={styles.impactBlockLabel}>Then</span>
          <span className={styles.impactBlockText}>{then.fix}</span>
        </div>
      )}
      <div className={styles.impactBlock}>
        <span className={styles.impactBlockLabel}>Later — future-ready</span>
        <span className={styles.impactBlockText}>Prepare your store for agent-driven purchases as the standards mature.</span>
      </div>
      <Link href={fixHref} className={styles.btn} style={{ display: "block", textAlign: "center", marginTop: 6 }}>
        Fix my highest-priority issue →
      </Link>
    </div>
  );
}

"use client";

import Link from "next/link";
import styles from "../test.module.css";

export default function AuditCTA({ brandWebsite }) {
  const href = brandWebsite ? `/audit?domain=${encodeURIComponent(brandWebsite)}` : "/audit";
  return (
    <div className={styles.card}>
      <div className={styles.h2}>Next: check if AI agents can actually buy from you</div>
      <p className={styles.sectionHint} style={{ marginBottom: 14 }}>
        Getting recommended is one thing — being findable, readable and actually purchasable by an
        AI agent is another. Free agent readiness audit, no signup.
      </p>
      <Link href={href} className={styles.btn} style={{ display: "block", textAlign: "center" }}>
        Run the agent readiness audit
      </Link>
    </div>
  );
}

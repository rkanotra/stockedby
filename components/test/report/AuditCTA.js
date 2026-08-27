"use client";

import Link from "next/link";
import styles from "../test.module.css";

export default function AuditCTA({ brandWebsite }) {
  const href = brandWebsite ? `/audit?domain=${encodeURIComponent(brandWebsite)}` : "/audit";
  return (
    <div className={styles.card}>
      <div className={styles.h2}>Recommendation visibility is only part of the picture.</div>
      <p className={styles.sectionHint} style={{ marginBottom: 14 }}>
        Check whether AI can properly access and understand your website.
      </p>
      <Link href={href} className={styles.btn} style={{ display: "block", textAlign: "center" }}>
        Run AI Store Audit →
      </Link>
    </div>
  );
}

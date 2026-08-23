"use client";

import Link from "next/link";
import styles from "../test.module.css";

export default function FixPlanCTA({ brandWebsite }) {
  const href = brandWebsite ? `/fix?domain=${encodeURIComponent(brandWebsite)}` : "/fix";
  return (
    <div className={styles.card}>
      <div className={styles.h2}>Or skip straight to the fix</div>
      <p className={styles.sectionHint} style={{ marginBottom: 14 }}>
        We&rsquo;ll write the actual code your product pages need — free, paste-ready, no
        developer required to get started.
      </p>
      <Link href={href} className={styles.btn} style={{ display: "block", textAlign: "center" }}>
        Generate the fix
      </Link>
    </div>
  );
}

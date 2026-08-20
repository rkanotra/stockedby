"use client";

import styles from "../test.module.css";

export default function TrustedSourcesCard({ trustedSources }) {
  if (!trustedSources || trustedSources.length === 0) return null;
  const maxSrc = trustedSources[0][1] || 1;

  return (
    <div className={styles.card}>
      <div className={styles.h2}>Sources AI trusted</div>
      <p className={styles.sectionHint}>
        The websites AI actually read to form its answer — your best targets for reviews and PR.
      </p>
      {trustedSources.map(([domain, n]) => (
        <div className={styles.srcrow} key={domain}>
          <span className={styles.srcname}>{domain}</span>
          <span className={styles.srcbar}>
            <span style={{ width: `${(n / maxSrc) * 100}%` }} />
          </span>
          <span className={styles.srccount}>{n}×</span>
        </div>
      ))}
    </div>
  );
}

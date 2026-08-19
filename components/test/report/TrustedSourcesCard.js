"use client";

import styles from "../test.module.css";

export default function TrustedSourcesCard({ trustedSources }) {
  if (!trustedSources || trustedSources.length === 0) return null;
  const maxSrc = trustedSources[0][1] || 1;

  return (
    <div className={styles.card}>
      <div className={styles.h2}>Sources Claude trusted</div>
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

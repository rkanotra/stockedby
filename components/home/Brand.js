import Link from 'next/link';
import styles from './home.module.css';

export default function Brand({ inverse = false }) {
  return <Link href="/" className={`${styles.brand} ${inverse ? styles.brandInverse : ""}`} aria-label="StockedBy home">
    {/* Local vector mark: two shelves forming an abstract S. */}
    {/* eslint-disable-next-line @next/next/no-img-element -- tiny local SVG with reserved dimensions */}
    <img src="/brand/stockedby-mark.svg" alt="" width="36" height="36" />
    <span>stockedby<span className={styles.brandPeriod}>.</span></span>
  </Link>;
}

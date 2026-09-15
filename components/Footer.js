import Link from 'next/link';
import Brand from './home/Brand';
import styles from './home/home.module.css';

export default function Footer() {
  return <footer className={styles.footer}>
    <div className={styles.container}>
      <div className={styles.footerTop}>
        <div><Brand /><p>Know where your brand stands<br />in the next era of shopping.</p></div>
        <div className={styles.footerLinks}>
          <Link href="/how">How it works</Link><Link href="/why">Why StockedBy</Link>
          <Link href="/purchase-check">Purchase Check</Link><Link href="/blog">Journal</Link><Link href="/privacy">Privacy</Link>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>© 2026 StockedBy</span><span>Made for brands in India and the Gulf.</span><a href="#top">Back to top ↑</a>
      </div>
    </div>
  </footer>;
}

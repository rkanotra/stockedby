import Link from 'next/link';
import Brand from '../home/Brand';
import styles from '../test/test.module.css';

export default function AppHeader({ children }) {
  return <div className={styles.topNav}>
    <Brand />
    <div className={styles.appNavLinks}>{children}<Link href="/">Back to home <span aria-hidden="true">↗</span></Link></div>
  </div>;
}

'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import Brand from './Brand';
import styles from './home.module.css';
const links = [['/how','How it works'],['/purchase-check','Purchase Check'],['/blog','Journal'],['/audit','Agent check']];
export default function Navigation() {
  const [open,setOpen] = useState(false);
  const trigger = useRef(null);
  return <nav className={styles.nav} aria-label="Main navigation">
    <Brand />
    <div className={styles.desktopLinks}>{links.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}</div>
    <Link href="/test" className={styles.navCta}>Check my brand <span aria-hidden="true">↗</span></Link>
    <div className={styles.mobileMenu} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}}}>
      <button type="button" ref={trigger} aria-expanded={open} aria-controls="home-menu" onClick={()=>setOpen(!open)}>{open?'Close':'Menu'} <span aria-hidden="true">{open?'−':'+'}</span></button>
      <div id="home-menu" hidden={!open} className={styles.menuPanel}>{links.map(([href,label])=><Link href={href} key={href}>{label}</Link>)}<Link href="/test">Check my brand — free</Link></div>
    </div>
  </nav>;
}

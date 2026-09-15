import Link from 'next/link';
import Image from 'next/image';
import Navigation from './Navigation';
import Brand from './Brand';
import ExampleReport from './ExampleReport';
import DomainCheckForm from '../DomainCheckForm';
import { HERO_BRAND, HERO_ENGINES } from '@/lib/heroExample';
import styles from './home.module.css';
const markets = [
  ['UAE','English & Gulf Arabic. Local retailers and category context.'],
  ['Saudi Arabia','Saudi Arabic, local retailers and seasonal shopping intent.'],
  ['Qatar','Gulf Arabic, QAR budgets and local shopping destinations.'],
  ['Kuwait','Gulf Arabic, KWD budgets and category-specific retailers.'],
  ['Oman','An initial query bank with Omani currency and retailer context.'],
  ['Bahrain','An initial query bank with local currency and cross-border context.'],
];
export default function Homepage() {
  return <div className={styles.home} id="top">
    <a className={styles.skipLink} href="#main-content">Skip to content</a>
    <div className={styles.container}><Navigation /></div>
    <main id="main-content">
      <section className={styles.hero} id="top-hero" aria-labelledby="hero-title">
        <div className={styles.heroText}>
        <div className={styles.eyebrow}>AI VISIBILITY FOR INDEPENDENT BRANDS</div>
        <h1 id="hero-title">Get on AI’s<br/>shopping <span>shortlist.</span></h1>
        <p className={styles.heroCopy}>Your next customer is asking AI what to buy.<br className={styles.desktopBreak}/> Find out if it recommends you, who gets picked instead,<br className={styles.desktopBreak}/> and what’s worth fixing.</p>
        <div className={styles.formWrap}><DomainCheckForm /></div>
        <p id="domain-help" className={styles.reassurance}>Free test. About 2 minutes. No card required.</p>
        <div className={styles.assistants}><span>See what shoppers hear from</span><div><span>ChatGPT</span><span>Gemini</span><span>Claude</span></div></div>
        <a className={styles.exampleLink} href="#result-example">Take a look inside <span aria-hidden="true">↓</span></a>
        </div>
        <div className={styles.heroArtwork} aria-hidden="true"><Image src="/brand/commerce-display.webp" alt="" width={1200} height={800} sizes="(max-width: 760px) 100vw, 50vw" priority /></div>
      </section>
      <section id="result-example" className={`${styles.exampleSection} ${styles.container}`}>
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>A REAL EXAMPLE</p><h2>A mention is good.<br/>The full picture is better.</h2></div><p>A clear view of who AI recommends,<br className={styles.desktopBreak}/> where you rank, and where buyers go.</p></div>
        <ExampleReport engines={HERO_ENGINES} brand={HERO_BRAND} />
        <div className={styles.exampleFootnote}><span>Example: minimalist-vitamin-c</span><span>Collected API snapshots · August 2026 · Not a live scan</span></div>
      </section>
      <section className={styles.story}>
        <div className={styles.container}>
          <div className={styles.storyIntro}><p className={styles.kicker}>A NEW PLACE TO BE FOUND</p><h2>Your next competitor<br/>could be <span>an answer.</span></h2><p>When a shopper asks AI for a recommendation, a shortlist appears before they reach your website. StockedBy helps you understand your place on it.</p></div>
          <div className={styles.benefits}>
            <article><span className={styles.stepNumber}>01 / VISIBILITY</span><h3>Are you in the answer?</h3><p>See whether ChatGPT, Gemini and Claude recommend your brand for the questions your customers ask.</p><div className={styles.featureDetail}><span className={styles.outlineIcon} aria-hidden="true">◎</span><span>Your brand, in context.</span></div></article>
            <article><span className={styles.stepNumber}>02 / COMPETITION</span><h3>Who makes the shortlist?</h3><p>Find the brands and marketplaces that appear alongside you—or take your place in the recommendation.</p><div className={styles.featureDetail}><span className={styles.outlineIcon} aria-hidden="true">≋</span><span>See who gets picked.</span></div></article>
            <article><span className={styles.stepNumber}>03 / NEXT STEPS</span><h3>What’s worth fixing?</h3><p>Get a focused set of suggested actions, grounded in your results, to help you decide where to start.</p><div className={styles.featureDetail}><span className={styles.outlineIcon} aria-hidden="true">↳</span><span>Leave with a next move.</span></div></article>
          </div>
          <Link className={styles.textLink} href="/how">See how the test works <span aria-hidden="true">↗</span></Link>
        </div>
      </section>
      <section className={`${styles.marketSection} ${styles.container}`} id="markets">
        <div className={styles.sectionHeading}><div><p className={styles.kicker}>LOCAL QUESTIONS. USEFUL ANSWERS.</p><h2>Built for the way<br/>your customers shop.</h2></div><p>A ₹700 skincare question in India isn’t the same as a QAR 100 question in Qatar. Your market changes the test.</p></div>
        <div className={styles.marketGrid}><div className={styles.india}><span className={styles.kicker}>STARTING CLOSE TO HOME</span><h3>India</h3><p>English and Hinglish. Rupee budgets. Festive and wedding-season shopping.</p><div className={styles.indiaFoot}><strong>100 categories live</strong><span>Competitor context includes<br/>Amazon.in, Flipkart, Meesho & Nykaa.</span></div></div><div className={styles.gulf}><h3>And across the Gulf.</h3><div>{markets.map(([name,description])=><details key={name}><summary>{name}<span aria-hidden="true">+</span></summary><p>{description}</p></details>)}</div></div></div>
        <div className={styles.technical}><div><span className={styles.kicker}>FOR YOUR TECHNICAL TEAM</span><h3>Can AI agents use your store?</h3><p>Check whether an AI agent can read your site and navigate the buying journey.</p></div><Link href="/audit" className={styles.outlineButton}>Run agent check <span aria-hidden="true">↗</span></Link></div>
      </section>
      <section className={styles.closing}><div className={styles.container}><p className={styles.kicker}>YOUR BRAND BELONGS IN THE CONVERSATION</p><h2>Find out where you stand.</h2><p>Start with your website. See what AI says.</p><Link href="/test" className={styles.primaryButton}>Check my brand — free <span aria-hidden="true">↗</span></Link><span className={styles.closingFine}>Free test. No card required.</span></div></section>
    </main>
    <footer className={styles.footer}><div className={styles.container}><div className={styles.footerTop}><div><Brand /><p>Know where your brand stands<br/>in the next era of shopping.</p></div><div className={styles.footerLinks}><Link href="/how">How it works</Link><Link href="/why">Why StockedBy</Link><Link href="/blog">Journal</Link><Link href="/privacy">Privacy</Link></div></div><div className={styles.footerBottom}><span>© 2026 StockedBy</span><span>Made for brands in India and the Gulf.</span><a href="#top">Back to top ↑</a></div></div></footer>
  </div>;
}

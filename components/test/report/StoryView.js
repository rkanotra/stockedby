"use client";

import Link from "next/link";
import styles from "../test.module.css";
import { matches } from "@/lib/scoring";
import { buildLayerOne } from "@/lib/layerOne";
import TestAnotherCTA from "./TestAnotherCTA";

const APPEAR_COLOR = { YES: "#5bd6a0", SOMETIMES: "#ffc53d", NO: "#ff6b57" };
const APPEAR_CLASS = { YES: "vGood", SOMETIMES: "vMid", NO: "vBad" };

// Layer 1 — the report's default view (CLAUDE.md-style philosophy: simple
// first, detail on request). Four cards, phrased as the questions a
// non-technical shop owner actually has, max ~12 words a sentence, no
// percentages or scores. All computed by lib/layerOne.js, which
// app/api/lead/route.js reuses verbatim for the merchant email — same
// numbers everywhere, never two versions of the story.
export default function StoryView({ data, onSeeFullDetails }) {
  const { brand, report, engines, sentiment, trustedSources, brandWebsite, market, category } = data;
  const { appearance, brands, destinations, actions } = buildLayerOne({
    brand,
    report,
    engines,
    sentiment,
    trustedSources,
    brandWebsite,
  });

  return (
    <>
      <div className={styles.card}>
        <span className={styles.label}>Do AI apps recommend {brand}?</span>
        <div className={`${styles.storyBig} ${styles[APPEAR_CLASS[appearance.verdict]]}`}>
          {appearance.verdict}
        </div>
        <p className={styles.storyLine}>
          You appeared in {appearance.appearedIn} of {appearance.totalAttempted} shopper questions.
        </p>
      </div>

      <div className={styles.card}>
        <span className={styles.label}>Who does AI recommend?</span>
        {brands.top.length === 0 ? (
          <p className={styles.storyLine}>No AI answers yet for this category.</p>
        ) : (
          <div className={styles.storyBrandList}>
            {brands.top.map((b, i) => {
              const isYou = matches(brand, b.label);
              return (
                <div key={i} className={`${styles.storyBrandRow} ${isYou ? styles.storyBrandRowYou : ""}`}>
                  <span>{b.label}</span>
                  {isYou && <span className={styles.storyYouTag}>you</span>}
                </div>
              );
            })}
          </div>
        )}
        {!brands.brandInTop && brands.top.length > 0 && (
          <p className={styles.storyLine} style={{ color: "#ff6b57" }}>
            {brand} is missing from this list.
          </p>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.label}>Where does AI send buyers to pay?</span>
        <p className={styles.storyLine}>
          Your shop: {destinations.yours} times · Other shops: {destinations.others} times
        </p>
        {destinations.others > destinations.yours && destinations.topOtherDomain && (
          <p className={styles.storyLine} style={{ color: "#ff6b57" }}>
            Buyers go to {destinations.topOtherDomain}. That shop takes commission from your sale.
          </p>
        )}
        {destinations.yours > 0 && destinations.yours >= destinations.others && (
          <p className={styles.storyLine} style={{ color: "#5bd6a0" }}>
            Most buyers go straight to your shop.
          </p>
        )}
      </div>

      <div className={styles.card}>
        <span className={styles.label}>What should you do now?</span>
        <ul className={styles.storyActions}>
          {actions.map((a, i) => (
            <li key={i}>{a.href ? <Link href={a.href}>{a.text}</Link> : a.text}</li>
          ))}
        </ul>
      </div>

      <button type="button" className={styles.btnFullReport} onClick={onSeeFullDetails}>
        See full report — who, where, and why →
      </button>

      {category?.name && (
        <TestAnotherCTA categoryName={category.name} brand={brand} brandWebsite={brandWebsite} market={market} />
      )}
    </>
  );
}

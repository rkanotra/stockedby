"use client";

import { useState } from "react";
import styles from "../test.module.css";
import {
  ENGINE_ORDER,
  ENGINE_LABELS,
  ARCH_LABELS,
  DEST_LABELS,
  matches,
  isRivalFor,
  effectiveDestination,
  sanitizeBrandLabel,
} from "@/lib/scoring";

// Same treatment as components/test/report/CheckoutBattleCard.js's
// DEST_COLORS (hard rule 5): neutral for brand-direct, the one accent for
// marketplace, aggregator keeps its own distinct comparison-blue.
const DEST_COLORS = {
  "brand-direct": "var(--text-secondary)",
  marketplace: "var(--accent)",
  aggregator: "#4a9fd8",
  none: "var(--border-strong)",
};

const hasRealData = (engines, e) => (engines[e] || []).some((r) => r.source !== "missing");

// Rendered both as a visible caption (mobile-first — a hover-only tooltip
// would never reach a touch device) and as a title= tooltip on the
// non-claude tabs for desktop hover, so the explanation isn't gated behind
// either mechanism alone.
const FRESHNESS_EXPLAINER =
  "We fetch each engine’s answer live the first time a category is tested, then reuse it briefly so repeat tests stay fast and affordable — Claude re-runs fresh every time.";

export default function ShelvesCard({ market, brand, competitor, engines }) {
  // ChatGPT first if it actually has data for this category — that's the
  // engine most founders think of first — falling back to Claude (always
  // has data, since it's the one just tested live) when it doesn't.
  const [activeEngine, setActiveEngine] = useState(() => (hasRealData(engines, "chatgpt") ? "chatgpt" : "claude"));
  const isRival = isRivalFor(market);
  const hasComp = Boolean(competitor && competitor.trim());
  // Local date, not UTC — a snapshot collected_on (server-stamped in UTC,
  // see app/api/test/route.js) landing on "today" from the merchant's own
  // clock is the plain-language claim "fresh today" is making.
  const todayLocal = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const engineTabInfo = (e) => {
    const rows = engines[e] || [];
    if (e === "claude") return "live";
    const withData = rows.find((r) => r.source !== "missing");
    if (!withData) return "data coming soon";
    // Same "fresh today" label whether this row was just on-demand
    // harvested for this exact test (source live-harvest) or is a cached
    // snapshot that merely happens to be dated today — both are equally
    // "fresh," the distinction that matters to a merchant is the date, not
    // which of those two paths produced it.
    return withData.collected_on === todayLocal ? "fresh today" : `collected ${withData.collected_on}`;
  };

  const activeRows = (engines[activeEngine] || []).filter((r) => r.source !== "missing");
  const missingCount = (engines[activeEngine] || []).filter((r) => r.source === "missing").length;

  return (
    <div className={styles.card}>
      <div className={styles.h2}>The shelves</div>
      <p className={styles.sectionHint}>
        Every AI engine&rsquo;s actual ranked answer, side by side — see where you rank against
        competitors on each one.
      </p>
      <div className={styles.tabs}>
        {ENGINE_ORDER.map((e) => (
          <button
            key={e}
            type="button"
            className={`${styles.tab} ${activeEngine === e ? styles.active : ""}`}
            aria-pressed={activeEngine === e}
            onClick={() => setActiveEngine(e)}
            title={e !== "claude" ? FRESHNESS_EXPLAINER : undefined}
          >
            {ENGINE_LABELS[e]}
            <span className={styles.st}>{engineTabInfo(e)}</span>
          </button>
        ))}
      </div>
      <p className={styles.hint} style={{ marginTop: 10 }}>{FRESHNESS_EXPLAINER}</p>

      {activeRows.map((r) => {
        const youIdx = r.recs.findIndex((rec) => matches(brand, rec.brand) || matches(brand, rec.product));
        const compIdx = hasComp
          ? r.recs.findIndex((rec) => matches(competitor, rec.brand) || matches(competitor, rec.product))
          : -1;
        return (
          <div className={styles.shelf} key={r.qid}>
            <p className={styles.shelfQ} dir="auto">
              <span className={styles.arch} style={{ marginRight: 8, marginBottom: 0 }}>
                {r.archetype === "branded-routing"
                  ? "Checkout test · where AI sends buyers who already chose you"
                  : ARCH_LABELS[r.archetype] || r.archetype}
              </span>
              “{r.text}”
            </p>
            <div className={styles.slots}>
              {r.recs.map((rec, j) => {
                const tagClass =
                  j === youIdx ? styles.tagYou : j === compIdx ? styles.tagComp : isRival(rec.brand) ? styles.tagAmz : "";
                const dest = effectiveDestination(rec, { isYou: j === youIdx });
                return (
                  <div key={j} className={`${styles.tag} ${tagClass}`} title={rec.product}>
                    <span className={styles.rk}>#{j + 1}</span>
                    {sanitizeBrandLabel(rec.brand)}
                    {dest !== "none" && (
                      <span className={styles.dest} style={{ color: j === youIdx ? "var(--on-accent)" : DEST_COLORS[dest] }}>
                        → {DEST_LABELS[dest]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className={styles.plank} />
            {youIdx === -1 && <div className={styles.missing}>✕ {brand} is not on this shelf</div>}
          </div>
        );
      })}

      {activeEngine !== "claude" && activeRows.length === 0 && (
        <div className={styles.notharvested}>
          {ENGINE_LABELS[activeEngine]} data coming soon for this category — check back soon.
        </div>
      )}
      {activeEngine !== "claude" && activeRows.length > 0 && missingCount > 0 && (
        <div className={styles.notharvested}>
          {ENGINE_LABELS[activeEngine]} data coming soon for {missingCount} of these question
          {missingCount === 1 ? "" : "s"}.
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import styles from "../test.module.css";
import { ENGINE_ORDER, ENGINE_LABELS, matches, sanitizeBrandLabel } from "@/lib/scoring";

// "How AI ranks you" — engines are a supporting dimension, not the story
// (CLAUDE.md's redesign phase): compact tabs, default to one engine,
// never three giant cards side by side. Defaults to ChatGPT when it has
// real data (the engine most founders think of first), else Claude
// (always has data — the one just tested live), same fallback ShelvesCard
// already used.
const hasRealData = (engines, e) => (engines[e] || []).some((r) => r.source !== "missing");

function questionInsight(row, brand) {
  const recs = row.recs || [];
  const idx = recs.findIndex((rec) => rec && (matches(brand, rec.brand) || matches(brand, rec.product)));
  const appeared = idx >= 0;
  const top3 = recs.slice(0, 3);
  let tells = null;
  if (!appeared && top3.length > 0) {
    tells = `AI isn't recommending ${brand} yet for this kind of question.`;
  } else if (appeared && idx > 0) {
    const ahead = top3
      .slice(0, idx)
      .map((r) => sanitizeBrandLabel(r.brand || r.product))
      .filter(Boolean);
    if (ahead.length > 0) tells = `${ahead.join(", ")} appeared before you.`;
  }
  return { appeared, rank: appeared ? idx + 1 : null, top3, tells };
}

function QuestionCard({ row, brand }) {
  const insight = questionInsight(row, brand);
  return (
    <div className={styles.questionCard}>
      <p className={styles.questionAsked} dir="auto">
        Shopper asked: &ldquo;{row.text}&rdquo;
      </p>
      <div className={styles.questionStatus}>
        {insight.appeared ? `You ranked #${insight.rank}.` : "You weren't recommended."}
      </div>
      {insight.top3.length > 0 && (
        <ul className={styles.questionTop3}>
          {insight.top3.map((rec, i) => (
            <li
              key={i}
              className={`${styles.questionTop3Row} ${insight.appeared && i === insight.rank - 1 ? styles.questionTop3RowYou : ""}`}
            >
              <span className={styles.questionTop3Rank}>{i + 1}.</span>
              <span>{sanitizeBrandLabel(rec.brand || rec.product) || "—"}</span>
            </li>
          ))}
        </ul>
      )}
      {insight.tells && <p className={styles.questionTells}>{insight.tells}</p>}
    </div>
  );
}

export default function EngineTabs({ brand, engines }) {
  const [activeEngine, setActiveEngine] = useState(() => (hasRealData(engines, "chatgpt") ? "chatgpt" : "claude"));
  const [showAll, setShowAll] = useState(false);

  // Organic questions only (excludes the branded-routing "where can I buy
  // genuine {brand}" question, which always names the brand by
  // construction and doesn't tell an interesting comparison story here —
  // same exclusion lib/scoring.js's own verdict computation uses).
  const rows = (engines[activeEngine] || []).filter((r) => r.source !== "missing" && r.archetype !== "branded-routing");

  const withInsight = rows.map((row) => ({ row, insight: questionInsight(row, brand) }));
  const win = [...withInsight].filter((r) => r.insight.appeared).sort((a, b) => a.insight.rank - b.insight.rank)[0];
  const loss = withInsight.find((r) => !r.insight.appeared);
  const featured = [win, loss].filter(Boolean);
  const visible = showAll ? withInsight : featured.length > 0 ? featured : withInsight.slice(0, 2);
  const restCount = withInsight.length - visible.length;

  return (
    <div>
      <div className={styles.h2}>How AI ranks you</div>
      <p className={styles.sectionHint}>See what happens when shoppers ask ChatGPT, Gemini and Claude what to buy.</p>
      <div className={styles.tabs}>
        {ENGINE_ORDER.map((e) => {
          const engineRows = (engines[e] || []).filter((r) => r.source !== "missing");
          return (
            <button
              key={e}
              type="button"
              className={`${styles.tab} ${activeEngine === e ? styles.active : ""}`}
              onClick={() => {
                setActiveEngine(e);
                setShowAll(false);
              }}
            >
              {ENGINE_LABELS[e]}
              <span className={styles.st}>{engineRows.length > 0 ? "checked" : "data coming soon"}</span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className={styles.notharvested}>{ENGINE_LABELS[activeEngine]} data coming soon for this category.</div>
      ) : (
        <>
          {visible.map(({ row }) => (
            <QuestionCard key={row.qid} row={row} brand={brand} />
          ))}
          {!showAll && restCount > 0 && (
            <button type="button" className={styles.plainLink} onClick={() => setShowAll(true)}>
              View all {withInsight.length} tests →
            </button>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import styles from "../test.module.css";

// "Has this improved?" — Phase 1 "Foundation" historical tracking,
// hardened in Phase 1.5 (supabase/migrations/0008_ai_observations.sql /
// 0009_ai_observations_hardening.sql, lib/observations.js, app/api/history).
// Reads the real per-day trend for this exact report's brand+market+
// category via its slug (app/api/history resolves those server-side from
// the report row — see that route's own security-review comment on why it
// no longer accepts raw brand/market/category params); renders nothing at
// all below 2 real historical days — a single point isn't a trend, and
// most visitors are testing for the first time, so this card is silent for
// them rather than showing an empty/placeholder state (hard rule 2's
// never-fabricate spirit extended to "never pad the report with a card
// that has nothing real to say").
export default function VisibilityHistoryCard({ brand, slug }) {
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const params = new URLSearchParams({ slug });
    fetch(`/api/history?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setTrend(Array.isArray(data?.trend) ? data.trend : []);
      })
      .catch(() => {
        if (!cancelled) setTrend([]);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!trend || trend.length < 2) return null;

  const first = trend[0];
  const last = trend[trend.length - 1];
  const fmt = (n) => (n === null || n === undefined ? "—" : `${n}%`);

  return (
    <div className={styles.card}>
      <div className={styles.h2}>Has this improved?</div>
      <p className={styles.sectionHint}>
        AI recommended {brand} in {fmt(first.appearance_rate)} of questions on {first.observed_on}, now{" "}
        {fmt(last.appearance_rate)} as of {last.observed_on} — across {trend.length} tests over time.
      </p>
      <div className={styles.sovrow}>
        <span>Own-site share, first test</span>
        <span className={styles.p}>{fmt(first.own_site_pct)}</span>
      </div>
      <div className={styles.sovrow}>
        <span>Own-site share, most recent</span>
        <span className={styles.p}>{fmt(last.own_site_pct)}</span>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import styles from "./test.module.css";
import { ENGINE_ORDER, ENGINE_LABELS, engineStatusLabel } from "@/lib/scoring";

// Each question now runs as its own request (lib/runQueries.js, called
// from components/test/TestFlow.js) instead of one /api/test invocation
// running all of them internally — so liveStatus (qid -> "searching" |
// "done" | "error") reflects real per-question completion, not one shared
// state for the whole batch.
//
// harvestingEngines: computed client-side (TestFlow.js, via lib/freshness.js
// against the category data already bundled by lib/bankStatic.js) — which
// non-claude engines lack a snapshot newer than SNAPSHOT_MAX_AGE_DAYS and
// will therefore be harvested live by this run. This is a best-effort UI
// hint, not a guarantee: the server only actually harvests an engine if its
// API key is configured (lib/harvestClients.js), which the client can't see
// in advance. No data is fabricated either way — if the on-demand harvest
// doesn't happen, the post-run tab correctly falls back to the real
// snapshot date or "data coming soon" once the response lands.
// engineStatusLabel() (lib/scoring.js) is the one shared function both the
// first run and the recheck screen use for the per-card freshness detail —
// exactly two states, no confusing third "checking live now…" middle
// state that read backwards for chatgpt/gemini when they were actually
// the ones being live-harvested.
//
// heading overrides the top line ("Asking ChatGPT, Gemini and Claude
// right now") — TestFlow.js's retry flow uses "Rechecking your shelf
// across ChatGPT, Gemini and Claude" instead. label overrides the
// "Asking N questions…" line below the tabs, scoped to just the
// question(s) actually being retried.
const DOT_CLASS = { searching: "dotSearching", done: "dotDone", error: "dotError" };

// Rotates under the question count — real users reported the wizard
// "looked frozen" during a live run (it can genuinely take up to a
// minute). Content that visibly changes over time is the strongest proof
// of life there is, on top of the spinner dots themselves — plain
// language throughout, no jargon (hard rule 12).
const STATUS_MESSAGES = [
  "Reading the real questions shoppers ask…",
  "Asking ChatGPT, Gemini and Claude…",
  "Checking which brands they recommend…",
  "This can take up to a minute…",
];
const ROTATE_MS = 3200;

function useRotatingStatus() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Still rotates under reduced-motion — the MESSAGE change is real
    // information, not gratuitous motion; only the CSS crossfade
    // (.runningStatus's transition) is disabled, see test.module.css.
    const id = setInterval(() => setI((v) => (v + 1) % STATUS_MESSAGES.length), reduceMotion ? ROTATE_MS * 1.5 : ROTATE_MS);
    return () => clearInterval(id);
  }, []);
  return STATUS_MESSAGES[i];
}

export default function RunningPanel({ queries, harvestingEngines = [], liveStatus = {}, label, heading }) {
  const rotatingStatus = useRotatingStatus();

  return (
    <div className={styles.card}>
      <span className={styles.label}>{heading || "Asking ChatGPT, Gemini and Claude right now"}</span>
      <div className={styles.tabs}>
        {ENGINE_ORDER.map((e) => {
          const isLive = e === "claude" || harvestingEngines.includes(e);
          return (
            <div key={e} className={`${styles.tab} ${styles.tabStatic}`}>
              {ENGINE_LABELS[e]}
              <span className={styles.st}>
                {isLive && <span className={styles.tabStatusDot} />}
                {engineStatusLabel(e, harvestingEngines)}
              </span>
            </div>
          );
        })}
      </div>
      <p className={styles.runningNote}>
        {label || `Asking ${queries.length} question${queries.length === 1 ? "" : "s"}…`}
      </p>
      <p className={styles.runningStatus} key={rotatingStatus} aria-live="polite">
        {rotatingStatus}
      </p>
      {queries.map((q, i) => {
        const status = liveStatus[q.qid] || "searching";
        return (
          <div className={styles.queryline} key={q.qid || i}>
            <span className={`${styles.dot} ${styles[DOT_CLASS[status]]}`} />
            <span style={{ flex: 1 }} dir="auto">{q.text}</span>
          </div>
        );
      })}
    </div>
  );
}

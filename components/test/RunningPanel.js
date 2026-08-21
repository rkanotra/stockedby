"use client";

import styles from "./test.module.css";
import { ENGINE_ORDER, ENGINE_LABELS } from "@/lib/scoring";

// All queries fire in one parallel batch server-side (see app/api/test),
// so we can't stream true per-query timing — every dot goes to "searching"
// together, then flips to its real per-query done/error state from the
// response. Still reflects real outcomes, just coarser-grained timing.
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
export default function RunningPanel({ queries, harvestingEngines = [] }) {
  const engineStatus = (e) => {
    if (e === "claude") return "live";
    if (harvestingEngines.includes(e)) return "testing live now…";
    return "loading collected data";
  };

  return (
    <div className={styles.card}>
      <span className={styles.label}>
        Claude · live test running
        {harvestingEngines.length > 0 &&
          ` — also refreshing ${harvestingEngines.map((e) => ENGINE_LABELS[e]).join(" + ")} for this category`}
      </span>
      <div className={styles.tabs}>
        {ENGINE_ORDER.map((e) => (
          <div key={e} className={`${styles.tab} ${styles.tabStatic}`}>
            {ENGINE_LABELS[e]}
            <span className={styles.st}>{engineStatus(e)}</span>
          </div>
        ))}
      </div>
      <p className={styles.runningNote}>
        Running {queries.length} question{queries.length === 1 ? "" : "s"} against Claude with
        live web search…
      </p>
      {queries.map((q, i) => (
        <div className={styles.queryline} key={q.qid || i}>
          <span className={`${styles.dot} ${styles.dotSearching}`} />
          <span style={{ flex: 1 }} dir="auto">{q.text}</span>
        </div>
      ))}
    </div>
  );
}

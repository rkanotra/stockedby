"use client";

import { useRef, useState } from "react";

// Interactive half of the hero report-card mock. All data (rows, dates,
// query text, which chips even exist) is resolved server-side in Hero.js
// from real snapshots — this component only ever toggles which
// already-resolved engine tab is shown. `children` is the static
// report-col-r (verdict / Share of AI Voice / engine badges) — it doesn't
// change per tab, so Hero.js renders it once and passes it straight
// through rather than duplicating it per engine.
export default function HeroReportCard({ engines, children }) {
  const defaultId = engines.find((e) => e.id === "chatgpt")?.id || engines[0]?.id;
  const [activeId, setActiveId] = useState(defaultId);
  const tabRefs = useRef({});

  if (engines.length === 0) return null;
  const active = engines.find((e) => e.id === activeId) || engines[0];

  function activate(id) {
    setActiveId(id);
  }

  // Standard WAI-ARIA tabs keyboard pattern: arrow keys move AND activate
  // (automatic activation), Home/End jump to the ends.
  function onKeyDown(e, idx) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    let nextIdx = idx;
    if (e.key === "ArrowLeft") nextIdx = (idx - 1 + engines.length) % engines.length;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % engines.length;
    if (e.key === "Home") nextIdx = 0;
    if (e.key === "End") nextIdx = engines.length - 1;
    const next = engines[nextIdx];
    activate(next.id);
    tabRefs.current[next.id]?.focus();
  }

  return (
    <>
      <div className="report-topbar">
        <div className="report-dots"><span /><span /><span /></div>
        <span className="report-url">stockedby.com/report/minimalist-vitamin-c</span>
        <span className="report-live">● {active.dateLabel}</span>
      </div>
      <div className="report-body">
        <div className="report-col-l">
          <div className="report-label">Query · real shopper set</div>
          <div className="report-engines" role="tablist" aria-label="AI engine">
            {engines.map((e, idx) => (
              <button
                key={e.id}
                ref={(el) => {
                  tabRefs.current[e.id] = el;
                }}
                type="button"
                role="tab"
                id={`hero-tab-${e.id}`}
                aria-selected={e.id === active.id}
                aria-controls={`hero-panel-${e.id}`}
                tabIndex={e.id === active.id ? 0 : -1}
                className={`chip ${e.id === active.id ? "active" : ""}`}
                onClick={() => activate(e.id)}
                onKeyDown={(ev) => onKeyDown(ev, idx)}
              >
                {e.label}
              </button>
            ))}
          </div>

          <div
            key={active.id}
            id={`hero-panel-${active.id}`}
            role="tabpanel"
            aria-labelledby={`hero-tab-${active.id}`}
            className="shelf-panel"
          >
            <div className="report-query" dir="auto">
              {active.query}
            </div>
            <div className="rank-list">
              {active.rows.map((r) => (
                <div className={`rank-row ${r.isYou ? "you" : ""}`} key={r.rank}>
                  <span className="rank-n">#{r.rank}</span>
                  <span className="rank-brand">{r.brand}</span>
                  {r.isYou && <span className="rank-you-badge">YOU</span>}
                  {r.destLabel && (
                    <span className={`rank-dest ${r.destClass}`}>→ {r.destDomain || r.destLabel}</span>
                  )}
                </div>
              ))}
            </div>
            <div className={`you-status ${active.youAppears ? "present" : "absent"}`}>
              {active.youAppears
                ? `✓ Minimalist is on this shelf — ranked #${active.bestRank}`
                : "✕ Minimalist is not on this shelf"}
            </div>
          </div>
        </div>

        {children}
      </div>
    </>
  );
}

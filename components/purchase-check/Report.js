"use client";
import Image from "next/image";
import { RESULT_LABELS, compareRuns } from "@/lib/purchaseCheck/model";
import s from "./purchase.module.css";
export default function Report({ run, previous, compact = false }) {
  const result = run.result;
  if (!result)
    return (
      <p className={s.status}>
        The report will appear after this check finishes.
      </p>
    );
  const comparison = compareRuns(previous, run);
  function download() {
    const { screenshot, ...evidence } = result;
    void screenshot;
    const blob = new Blob(
      [
        JSON.stringify(
          { journey: run.config, result: evidence, comparison },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stockedby-purchase-check.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div>
      {!compact && (
        <div className={s.reportActions}>
          <button className={s.secondary} onClick={download}>
            Download evidence ↓
          </button>
          <button
            className={s.secondary}
            onClick={() => {
              document
                .querySelectorAll("details[data-check]")
                .forEach((d) => (d.open = true));
              window.print();
            }}
          >
            Print / save PDF
          </button>
        </div>
      )}
      <div className={s.statGrid}>
        {[
          ["pass", "Passed"],
          ["issue", "Needs a fix"],
          ["unknown", "Unable to verify"],
        ].map(([status, label]) => (
          <div className={s.stat} key={status}>
            <strong>
              {result.checks.filter((c) => c.status === status).length}
            </strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      {comparison && (
        <div className={s.status}>
          <strong>Retest comparison: </strong>
          {comparison.filter((c) => c.resolved).length} previously failing
          check(s) now pass with the same baseline.
        </div>
      )}
      <div className={s.checks}>
        {result.checks.map((c) => (
          <details
            data-check
            key={c.code}
            className={s.check}
            open={c.status !== "pass"}
          >
            <summary>
              <h3>{c.title}</h3>
              <span className={s.badge} data-status={c.status}>
                {RESULT_LABELS[c.status]} +
              </span>
            </summary>
            <div>
              <div className={s.evidenceGrid}>
                <div>
                  <span>Expected</span>
                  <strong>{c.expected}</strong>
                </div>
                <div>
                  <span>Observed</span>
                  <strong>{c.observed}</strong>
                </div>
              </div>
              <p className={s.muted}>{c.detail}</p>
              {c.status !== "pass" && (
                <div className={s.guide}>
                  <h3>{c.guide[0]}</h3>
                  <p>{c.guide[1]}</p>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
      {result.screenshot && !compact && (
        <details className={s.row}>
          <summary className={s.muted}>View captured cart screenshot</summary>
          <Image
            unoptimized
            width={1280}
            height={900}
            className={s.image}
            src={`data:image/jpeg;base64,${result.screenshot}`}
            alt="Cart page captured during this check"
          />
        </details>
      )}
      <p className={s.footnote}>
        {result.sample
          ? "Illustrative sample. No real store was checked."
          : `Checked ${new Date(result.checkedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.`}{" "}
        {result.scope}
      </p>
      {run.review_note && (
        <div className={s.status}>
          <strong>Review note</strong>
          <br />
          {run.review_note}
        </div>
      )}
    </div>
  );
}

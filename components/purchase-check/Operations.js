"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  RESULT_LABELS,
  RUN_LABELS,
  formatMoney,
} from "@/lib/purchaseCheck/model";
import { sendAction } from "./Workspace";
import Report from "./Report";
import s from "./purchase.module.css";
export default function Operations({ initial, demo = false, setup = [] }) {
  const router = useRouter();
  const [sample, setSample] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [filter, setFilter] = useState("attention"),
    [selected, setSelected] = useState(null);
  const data = demo ? sample : initial;
  const attention =
    data.attention ||
    data.runs.filter(
      (r) =>
        r.review_status === "open" &&
        (r.status === "failed" ||
          ["issue", "unknown"].includes(r.result?.verdict)),
    );
  const queued = data.runs.filter((r) =>
    ["queued", "running"].includes(r.status),
  );
  async function action(body) {
    setBusy(true);
    setMessage("");
    try {
      if (demo) {
        if (body.action === "operator.settings")
          setSample((v) => ({
            ...v,
            settings: {
              ...v.settings,
              paused: body.paused,
              daily_limit: body.dailyLimit,
            },
          }));
        if (body.action === "operator.review")
          setSample((v) => ({
            ...v,
            runs: v.runs.map((r) =>
              r.id === body.id
                ? { ...r, review_status: body.decision, review_note: body.note }
                : r,
            ),
          }));
        if (body.action === "operator.payment")
          setSample((v) => ({
            ...v,
            payments: v.payments.filter((p) => p.id !== body.id),
            accounts: v.accounts.map((a) => ({
              ...a,
              credits: a.credits + (body.decision === "approved" ? 20 : 0),
            })),
          }));
        setMessage(
          "Sample updated. No live customer, payment or worker was changed.",
        );
      } else {
        await sendAction(body);
        router.refresh();
        setMessage("Saved.");
      }
    } catch (e) {
      setMessage(e.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const heartbeat = data.settings.heartbeat_at;
  const connected = demo || data.settings.connected;
  const selectedRun = [...data.runs, ...attention].find(
    (r) => r.id === selected,
  );
  return (
    <>
      {demo && (
        <div className={s.notice}>
          <span>
            <strong>Operator demo.</strong> Every store, finding and payment
            below is an illustrative sample.
          </span>
          <span>No live actions</span>
        </div>
      )}
      <div className={s.summary}>
        <div>
          <p className={s.eyebrow}>StockedBy / operator workspace</p>
          <h1>Your daily control room.</h1>
          <p className={s.muted}>
            Review the exceptions. Let the saved checks do the repeat work.
          </p>
        </div>
        <Link href="/dashboard/purchase-check" className={s.secondary}>
          Merchant workspace ↗
        </Link>
      </div>
      <div className={s.statGrid}>
        <div className={s.stat}>
          <strong>{data.attentionCount ?? attention.length}</strong>
          <span>Reports need review · oldest first</span>
        </div>
        <div className={s.stat}>
          <strong>{data.paymentCount ?? data.payments.length}</strong>
          <span>UPI references awaiting bank check</span>
        </div>
        <div className={s.stat}>
          <strong>{data.queueCount ?? queued.length}</strong>
          <span>Queued or running</span>
        </div>
      </div>
      {message && (
        <p className={s.status} role="status">
          {message}
        </p>
      )}
      <div className={s.split}>
        <section className={s.panel}>
          <div className={s.rowTop}>
            <h2>One inbox. Clear next steps.</h2>
            <span className={s.badge}>
              {data.settings.paused
                ? "Runner paused"
                : connected
                  ? "Worker connected"
                  : "Worker not connected"}
            </span>
          </div>
          <div className={s.tabs}>
            {[
              ["attention", "Needs attention"],
              ["payments", "Payments"],
              ["all", "Recent checks"],
            ].map(([id, label]) => (
              <button
                className={s.secondary}
                key={id}
                aria-pressed={filter === id}
                onClick={() => {
                  setFilter(id);
                  setSelected(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {filter === "payments" ? (
            data.payments.length ? (
              data.payments.map((p) => (
                <PaymentReview
                  key={p.id}
                  payment={p}
                  action={action}
                  busy={busy}
                />
              ))
            ) : (
              <div className={s.empty}>
                <h3>No payments waiting.</h3>
                <p>New UPI references appear here for a bank receipt check.</p>
              </div>
            )
          ) : (
            <>
              {(filter === "attention" ? attention : data.runs).length ===
                0 && (
                <div className={s.empty}>
                  <h3>You’re up to date.</h3>
                  <p>
                    Findings, uncertain results and failed runs will appear
                    here.
                  </p>
                </div>
              )}
              <div className={s.operatorList}>
                {(filter === "attention" ? attention : data.runs).map((r) => (
                  <div className={s.row} key={r.id}>
                    <div className={s.rowTop}>
                      <div>
                        <h3>{r.config.label}</h3>
                        <p>
                          {r.merchants?.email || "Sample merchant"} ·{" "}
                          {new Date(r.created_at).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <span className={s.badge} data-status={r.result?.verdict}>
                        {r.result
                          ? RESULT_LABELS[r.result.verdict]
                          : RUN_LABELS[r.status]}
                      </span>
                    </div>
                    <div className={s.rowActions}>
                      {demo ? (
                        <button
                          className={s.secondary}
                          onClick={() => setSelected(r.id)}
                        >
                          View evidence
                        </button>
                      ) : (
                        <Link
                          className={s.secondary}
                          href={`/dashboard/purchase-check/${r.id}`}
                        >
                          View evidence ↗
                        </Link>
                      )}
                      {r.result && (
                        <button
                          className={s.quiet}
                          onClick={() => {
                            const issues = r.result.checks.filter(
                              (c) => c.status !== "pass",
                            );
                            const draft = `Your StockedBy purchase check: ${r.config.label}\n\n${issues.map((c) => `${c.title}: ${RESULT_LABELS[c.status]}\nExpected: ${c.expected}\nObserved: ${c.observed}\nNext step: ${c.guide.join(" ")}`).join("\n\n")}\n\nApply the relevant change, then repeat the saved baseline in your workspace. ${r.result.scope}`;
                            navigator.clipboard
                              .writeText(draft)
                              .then(() =>
                                setMessage(
                                  "Customer reply draft copied. Review it before sending.",
                                ),
                              )
                              .catch(() =>
                                setMessage(
                                  "Clipboard unavailable. Open the report to copy the evidence.",
                                ),
                              );
                          }}
                        >
                          Copy reply draft
                        </button>
                      )}
                    </div>
                    {["completed", "failed"].includes(r.status) &&
                      r.review_status === "open" && (
                        <ReviewForm run={r} action={action} busy={busy} />
                      )}
                    {r.review_note && (
                      <p className={s.status}>{r.review_note}</p>
                    )}
                  </div>
                ))}
              </div>
              {selectedRun && (
                <div className={`${s.panel} ${s.blue}`}>
                  <h3>{selectedRun.config.label}</h3>
                  <Report run={selectedRun} compact />
                </div>
              )}
            </>
          )}
        </section>
        <aside>
          <form
            className={`${s.panel} ${s.mint}`}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action({
                action: "operator.settings",
                paused: f.get("paused") === "on",
                dailyLimit: Number(f.get("dailyLimit")),
              });
            }}
            key={`${data.settings.paused}-${data.settings.daily_limit}`}
          >
            <p className={s.eyebrow}>Protect your time & budget</p>
            <h2>Set the pace.</h2>
            <label className={s.field}>
              Maximum checks per UTC day
              <input
                name="dailyLimit"
                type="number"
                min="1"
                max="200"
                defaultValue={data.settings.daily_limit}
                required
              />
            </label>
            <label className={s.checkbox}>
              <input
                name="paused"
                type="checkbox"
                defaultChecked={data.settings.paused}
              />
              <span>
                Pause new checks. In-progress checks finish; queued checks wait.
              </span>
            </label>
            <button className={s.primary} disabled={busy}>
              Save runner controls
            </button>
            <p className={s.footnote}>
              Last worker contact:{" "}
              {demo
                ? "Sample connected state"
                : heartbeat
                  ? new Date(heartbeat).toLocaleString("en-IN")
                  : "Not connected yet"}
              . The worker processes a small batch approximately every 30
              minutes when enabled. Scheduling can be delayed by the host.
            </p>
          </form>
          <section className={s.panel}>
            <h3>Your operating routine</h3>
            <ol className={s.simpleList}>
              <li>Match pending UPI references to bank receipts.</li>
              <li>Read the evidence for flagged checks.</li>
              <li>Use the fix guide and copy a reply if needed.</li>
              <li>Review a retest before marking a fix verified.</li>
            </ol>
            <p className={s.footnote}>
              Passing checks stay out of the attention inbox. A non-passing
              result pauses that journey’s weekly schedule. A review note
              acknowledges a report; only a passing retest verifies a fix.
            </p>
          </section>
          {setup.length > 0 && (
            <section className={s.panel}>
              <h3>Launch connections</h3>
              {setup.map((item) => (
                <div className={s.rowTop} key={item.label}>
                  <p>{item.label}</p>
                  <span className={s.badge}>
                    {item.ready ? "Configured" : "Needed"}
                  </span>
                </div>
              ))}
            </section>
          )}
        </aside>
      </div>
      <section className={s.panel}>
        <h2>Pilot accounts</h2>
        <p>
          Grant a small starting balance once per merchant. Every grant and
          payment approval is recorded.
        </p>
        {!data.accounts.length && (
          <p className={s.muted}>
            Accounts appear when a merchant saves a store.
          </p>
        )}
        {data.accounts.map((a) => (
          <form
            key={a.merchant_id}
            className={s.row}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              action({
                action: "operator.grant",
                merchantId: a.merchant_id,
                amount: Number(f.get("amount")),
                note: f.get("note"),
              });
            }}
          >
            <div className={s.rowTop}>
              <h3>{a.merchants?.email}</h3>
              <span className={s.badge}>{a.credits} credits</span>
            </div>
            <div className={s.form}>
              <label className={s.field}>
                Pilot credits · 1–20
                <input
                  name="amount"
                  type="number"
                  defaultValue="3"
                  min="1"
                  max="20"
                  required
                />
              </label>
              <label className={s.field}>
                Reason
                <input
                  name="note"
                  required
                  minLength={3}
                  maxLength={300}
                  placeholder="First pilot, agreed scope"
                />
              </label>
            </div>
            <button className={s.quiet} disabled={busy || demo}>
              Grant once
            </button>
          </form>
        ))}
      </section>
      <section className={s.panel}>
        <h3>Recent credit activity</h3>
        {!data.ledger.length && <p>No credit activity yet.</p>}
        {data.ledger.map((l) => (
          <div className={s.rowTop} key={l.id}>
            <p>
              {l.merchants?.email} · {l.reason}
            </p>
            <span className={s.badge}>
              {l.delta > 0 ? "+" : ""}
              {l.delta}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
function ReviewForm({ run, action, busy }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        action({
          action: "operator.review",
          id: run.id,
          decision: f.get("decision"),
          note: f.get("note"),
        });
      }}
    >
      <div className={s.form}>
        <label className={s.field}>
          Review
          <select name="decision">
            <option value="accepted">
              Evidence reviewed / next step recorded
            </option>
            <option value="dismissed">Dismiss with reason</option>
          </select>
        </label>
        <label className={s.field}>
          Note shared on this report
          <input
            name="note"
            required
            minLength={3}
            maxLength={1000}
            placeholder="Confirmed discount eligibility mismatch. Retest after change."
          />
        </label>
      </div>
      <button className={s.quiet} disabled={busy}>
        Save review
      </button>
    </form>
  );
}
function PaymentReview({ payment: p, action, busy }) {
  return (
    <form
      className={s.row}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        action({
          action: "operator.payment",
          id: p.id,
          decision: f.get("decision"),
          note: f.get("note"),
          confirmed: f.get("confirmed") === "on",
        });
      }}
    >
      <h3>{p.merchants?.email}</h3>
      <p>
        {formatMoney(p.amount_inr * 100)} · RRN <strong>{p.reference}</strong>
      </p>
      <div className={s.form}>
        <label className={s.field}>
          Decision
          <select name="decision">
            <option value="approved">Received in bank · add 20 credits</option>
            <option value="rejected">
              Not received / wrong amount · reject
            </option>
          </select>
        </label>
        <label className={s.field}>
          Review note
          <input
            name="note"
            required
            minLength={3}
            maxLength={500}
            placeholder="Bank receipt and amount matched"
          />
        </label>
      </div>
      <label className={s.checkbox}>
        <input name="confirmed" type="checkbox" required />
        <span>
          I checked the bank record, reference, amount and payee. A customer’s
          reference alone is not proof of receipt.
        </span>
      </label>
      <button className={s.primary} disabled={busy}>
        Record decision
      </button>
    </form>
  );
}

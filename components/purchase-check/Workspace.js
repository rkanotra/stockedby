"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  RUN_LABELS,
  RESULT_LABELS,
  formatMoney,
} from "@/lib/purchaseCheck/model";
import { demoResult } from "@/lib/purchaseCheck/demo";
import { trackEvent } from "@/lib/analytics";
import Report from "./Report";
import s from "./purchase.module.css";

export async function sendAction(body) {
  const r = await fetch("/api/purchase-check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || "Please try again.");
  return d;
}
export default function Workspace({
  initial,
  config,
  demo = false,
  operator = false,
}) {
  const [data, setData] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [tab, setTab] = useState("journeys"),
    [selected, setSelected] = useState(null),
    [editing, setEditing] = useState(null),
    [adding, setAdding] = useState(false);
  const active = data.runs.some((r) =>
    ["queued", "running"].includes(r.status),
  );
  async function refresh() {
    const response = await fetch("/api/purchase-check", { cache: "no-store" });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error);
    setData(value);
  }
  useEffect(() => {
    if (demo || !active) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh().catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [demo, active]);
  async function action(body) {
    setBusy(true);
    setMessage("");
    try {
      if (demo) {
        if (body.action === "run") {
          if (data.credits < 1)
            throw new Error(
              "The sample credits have been used. Reload to restart the demo.",
            );
          const duplicate =
            body.parentId &&
            data.runs.find((r) => r.parent_run_id === body.parentId);
          if (duplicate) {
            setSelected(duplicate.id);
            return duplicate;
          }
          const parent = data.runs.find((r) => r.id === body.parentId),
            c = data.cases.find((c) => c.id === body.caseId),
            id = `sample-${data.runs.length + 1}`;
          const run = {
            id,
            case_id: c.id,
            store_id: c.store_id,
            config: c.config,
            status: "completed",
            source: parent ? "retest" : "manual",
            parent_run_id: parent?.id,
            result: demoResult(Boolean(parent)),
            review_status: "open",
            created_at: new Date().toISOString(),
          };
          setData((v) => ({
            ...v,
            credits: v.credits - 1,
            runs: [run, ...v.runs],
          }));
          setSelected(id);
          setMessage(
            parent
              ? "Sample retest: the discount now matches the unchanged baseline."
              : "Sample check complete. No store was contacted.",
          );
          return { id };
        }
        if (body.action === "case.schedule") {
          setData((v) => ({
            ...v,
            cases: v.cases.map((c) =>
              c.id === body.id ? { ...c, weekly: body.weekly } : c,
            ),
          }));
          setMessage("Demo setting changed. No real schedule was created.");
          return { ok: true };
        }
        throw new Error(
          "This preview uses a sample store. Open your workspace to add your own store and journeys.",
        );
      }
      const result = await sendAction(body);
      await refresh();
      if (body.action === "case.save") {
        setAdding(false);
        setEditing(null);
        trackEvent("purchase_check_journey_saved");
      }
      if (body.action === "run") {
        setMessage(
          "Check queued. You can leave this page; the result will be saved here.",
        );
        trackEvent("purchase_check_queued");
      } else setMessage("Saved.");
      return result;
    } catch (e) {
      setMessage(e.message || "Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  const report = data.runs.find((r) => r.id === selected);
  return (
    <>
      {demo && (
        <div className={s.notice}>
          <span>
            <strong>Interactive sample.</strong> Store, findings and credits are
            illustrative. Nothing is sent to a real store.
          </span>
          <Link className={s.link} href="/dashboard/purchase-check">
            Open my workspace ↗
          </Link>
        </div>
      )}
      <div className={s.summary}>
        <div>
          <p className={s.eyebrow}>Your store / your buying rules</p>
          <h1>Purchase Check</h1>
          <p className={s.muted}>
            Spot the gaps between choosing a product and reaching checkout.
          </p>
        </div>
        <div className={s.actions}>
          {operator && (
            <Link className={s.secondary} href="/dashboard/operations">
              Operations ↗
            </Link>
          )}
          <button
            className={s.secondary}
            disabled={busy}
            onClick={() => {
              setTab("stores");
              setSelected(null);
            }}
          >
            Manage stores
          </button>
        </div>
      </div>
      <div className={s.workspace}>
        <aside className={s.sidebar}>
          <div className={`${s.panel} ${s.blue}`}>
            <p className={s.eyebrow}>Check balance</p>
            <strong>{data.credits}</strong>
            <p>journey runs available</p>
            <p className={s.footnote}>
              One credit per run or retest. Worker failures return the credit.
            </p>
            <button
              className={s.quiet}
              onClick={() => {
                setTab("credits");
                setSelected(null);
              }}
            >
              Add check credits ↗
            </button>
          </div>
          <a
            href="#journey-content"
            onClick={() => {
              setTab("journeys");
              setSelected(null);
            }}
          >
            Saved journeys · {data.cases.length}/5
          </a>
          <a
            href="#journey-content"
            onClick={() => {
              setTab("reports");
              setSelected(null);
            }}
          >
            Recent reports · {data.runs.length}
          </a>
          <Link href="/audit">Free agent-readability check ↗</Link>
        </aside>
        <div id="journey-content">
          {data.settings.paused && (
            <p className={s.notice}>
              Checks are temporarily paused. You can prepare your store and save
              journeys.
            </p>
          )}
          {!demo && !data.settings.paused && !data.settings.connected && (
            <p className={s.notice}>
              The check runner has not connected recently. Queued work will wait
              for it to reconnect.
            </p>
          )}
          {message && (
            <p role="status" className={s.status}>
              {message}
            </p>
          )}
          {report ? (
            <section className={s.panel}>
              <button className={s.quiet} onClick={() => setSelected(null)}>
                ← Back to journeys
              </button>
              <h2>{report.config.label}</h2>
              <Report
                run={report}
                previous={data.runs.find((r) => r.id === report.parent_run_id)}
              />
              {!demo && (
                <Link
                  className={s.quiet}
                  href={`/dashboard/purchase-check/${report.id}`}
                >
                  Open full report & cart screenshot ↗
                </Link>
              )}
              <div className={s.actions}>
                <button
                  className={s.primary}
                  disabled={busy || data.credits < 1 || data.settings.paused}
                  onClick={() =>
                    action({
                      action: "run",
                      caseId: report.case_id,
                      parentId: report.id,
                    })
                  }
                >
                  {demo ? "Simulate fix & retest" : "Retest this baseline"} · 1
                  credit
                </button>
              </div>
              <p className={s.muted}>
                {demo
                  ? "The sample retest illustrates a corrected discount setting."
                  : "Apply your fix first. A retest repeats the same saved rules; it does not change your store."}
              </p>
            </section>
          ) : (
            <>
              <div className={s.tabs}>
                {[
                  ["journeys", "Journeys"],
                  ["reports", "Reports"],
                  ["stores", "Stores"],
                  ["credits", "Credits & UPI"],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    className={s.secondary}
                    aria-pressed={tab === id}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === "journeys" && (
                <>
                  <section className={s.panel}>
                    <div className={s.rowTop}>
                      <div>
                        <h2>Your repeatable checks.</h2>
                        <p>
                          One product, one variant and one set of purchase rules
                          per journey.
                        </p>
                      </div>
                      <button
                        className={s.primary}
                        disabled={
                          !data.stores.some((x) => x.verified_at) ||
                          data.cases.length >= 5
                        }
                        onClick={() => {
                          setAdding((v) => !v);
                          setEditing(null);
                        }}
                      >
                        + Add journey
                      </button>
                    </div>
                    {!data.cases.length ? (
                      <div className={s.empty}>
                        <h3>
                          {data.stores.some((x) => x.verified_at)
                            ? "Choose your first buying journey."
                            : "Start by verifying your store."}
                        </h3>
                        <p>
                          Setup is free. Checks use credits once the runner is
                          available.
                        </p>
                        <button
                          className={s.quiet}
                          onClick={() => setTab("stores")}
                        >
                          Set up a store ↗
                        </button>
                      </div>
                    ) : (
                      data.cases.map((c) => {
                        const latest = data.runs.find(
                            (r) => r.case_id === c.id,
                          ),
                          pending =
                            latest &&
                            ["queued", "running"].includes(latest.status);
                        return (
                          <div className={s.row} key={c.id}>
                            <div className={s.rowTop}>
                              <div>
                                <h3>{c.config.label}</h3>
                                <p>
                                  {formatMoney(c.config.expectedPricePaise)} ·
                                  PIN {c.config.pin} ·{" "}
                                  {
                                    data.stores.find((x) => x.id === c.store_id)
                                      ?.name
                                  }
                                </p>
                              </div>
                              <span
                                className={s.badge}
                                data-status={latest?.result?.verdict}
                              >
                                {latest?.result
                                  ? RESULT_LABELS[latest.result.verdict]
                                  : latest
                                    ? RUN_LABELS[latest.status]
                                    : "Ready for first check"}
                              </span>
                            </div>
                            <div className={s.rowActions}>
                              <button
                                className={s.primary}
                                disabled={
                                  busy ||
                                  pending ||
                                  data.credits < 1 ||
                                  data.settings.paused
                                }
                                onClick={() =>
                                  action({ action: "run", caseId: c.id })
                                }
                              >
                                {pending
                                  ? "Check in progress"
                                  : "Run check · 1 credit"}
                              </button>
                              {latest?.result && (
                                <button
                                  className={s.secondary}
                                  onClick={() => {
                                    setSelected(latest.id);
                                    trackEvent("purchase_check_report_opened");
                                  }}
                                >
                                  View evidence ↗
                                </button>
                              )}
                              <button
                                className={s.secondary}
                                disabled={busy || pending}
                                onClick={() => {
                                  setEditing(c);
                                  setAdding(false);
                                }}
                              >
                                Edit rules
                              </button>
                              {latest?.status === "queued" && (
                                <button
                                  className={s.quiet}
                                  disabled={busy}
                                  onClick={() =>
                                    action({ action: "cancel", id: latest.id })
                                  }
                                >
                                  Cancel & return credit
                                </button>
                              )}
                            </div>
                            <label className={s.checkbox}>
                              <input
                                type="checkbox"
                                checked={c.weekly}
                                disabled={busy}
                                onChange={(e) =>
                                  action({
                                    action: "case.schedule",
                                    id: c.id,
                                    weekly: e.target.checked,
                                  })
                                }
                              />
                              <span>
                                Check weekly using 1 credit per run. Pause if
                                the result needs attention.
                              </span>
                            </label>
                            {c.schedule_note && (
                              <p className={s.muted}>{c.schedule_note}</p>
                            )}
                            {c.weekly && c.next_run_at && (
                              <p className={s.muted}>
                                Next eligible run:{" "}
                                {new Date(c.next_run_at).toLocaleDateString(
                                  "en-IN",
                                )}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </section>
                  {(adding || editing) && (
                    <JourneyForm
                      key={editing?.id || "new"}
                      stores={data.stores.filter((x) => x.verified_at)}
                      existing={editing}
                      action={action}
                      busy={busy}
                      close={() => {
                        setAdding(false);
                        setEditing(null);
                      }}
                    />
                  )}
                </>
              )}
              {tab === "reports" && (
                <section className={s.panel}>
                  <h2>Evidence, saved.</h2>
                  <p>
                    Your latest 50 checks. Retests keep the original report.
                  </p>
                  {!data.runs.length && (
                    <div className={s.empty}>
                      Your first report will appear here after a check.
                    </div>
                  )}
                  {data.runs.map((r) => (
                    <div className={s.row} key={r.id}>
                      <div className={s.rowTop}>
                        <div>
                          <h3>{r.config.label}</h3>
                          <p>
                            {new Date(r.created_at).toLocaleString("en-IN")} ·{" "}
                            {r.source}
                          </p>
                        </div>
                        <span
                          className={s.badge}
                          data-status={r.result?.verdict}
                        >
                          {r.result
                            ? RESULT_LABELS[r.result.verdict]
                            : RUN_LABELS[r.status]}
                        </span>
                      </div>
                      {r.result && (
                        <button
                          className={s.quiet}
                          onClick={() => setSelected(r.id)}
                        >
                          Open report ↗
                        </button>
                      )}
                      {r.status === "failed" && (
                        <p className={s.status}>
                          The runner could not complete this check. Your credit
                          was returned.
                          {r.error_code === "ownership_lost"
                            ? " Verify store ownership again before retrying."
                            : ""}
                        </p>
                      )}
                    </div>
                  ))}
                </section>
              )}
              {tab === "stores" && (
                <>
                  <StoreForm action={action} busy={busy} />
                  {data.stores.map((store) => (
                    <section className={s.panel} key={store.id}>
                      <div className={s.rowTop}>
                        <div>
                          <h2>{store.name}</h2>
                          <p>{store.origin}</p>
                        </div>
                        <span className={s.badge}>
                          {store.verified_at
                            ? "Ownership verified"
                            : "Verification needed"}
                        </span>
                      </div>
                      {!store.verified_at ? (
                        <>
                          <p>
                            Add this tag inside the <code>&lt;head&gt;</code> of
                            your published Shopify theme. Keep it installed
                            while checks run.
                          </p>
                          <pre
                            className={s.code}
                          >{`<meta name="stockedby-verification" content="${store.verification_token}">`}</pre>
                          <div className={s.actions}>
                            <button
                              className={s.secondary}
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(
                                    `<meta name="stockedby-verification" content="${store.verification_token}">`,
                                  )
                                  .then(() =>
                                    setMessage("Verification tag copied."),
                                  )
                                  .catch(() =>
                                    setMessage(
                                      "Select and copy the tag above.",
                                    ),
                                  )
                              }
                            >
                              Copy tag
                            </button>
                            <button
                              className={s.primary}
                              disabled={busy}
                              onClick={() =>
                                action({ action: "store.verify", id: store.id })
                              }
                            >
                              Verify published theme
                            </button>
                          </div>
                          <details>
                            <summary className={s.muted}>
                              Where do I put this in Shopify?
                            </summary>
                            <p>
                              Online Store → Themes → your published theme →
                              Edit code → layout/theme.liquid. Paste the tag
                              before the closing head tag, then save. Use a
                              theme backup before editing.
                            </p>
                          </details>
                        </>
                      ) : (
                        <button
                          className={s.quiet}
                          onClick={() => {
                            setTab("journeys");
                            setAdding(true);
                          }}
                        >
                          Add a buying journey ↗
                        </button>
                      )}
                    </section>
                  ))}
                </>
              )}
              {tab === "credits" && (
                <Credits
                  config={config}
                  payments={data.payments}
                  action={action}
                  busy={busy}
                />
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
function StoreForm({ action, busy }) {
  return (
    <form
      className={s.panel}
      onSubmit={async (e) => {
        e.preventDefault();
        const f = e.currentTarget,
          values = Object.fromEntries(new FormData(f));
        const r = await action({ action: "store.create", ...values });
        if (r) f.reset();
      }}
    >
      <h2>Connect a store you manage.</h2>
      <p>
        Standard Shopify storefronts are supported in this pilot. No admin
        password is needed.
      </p>
      <div className={s.form}>
        <label className={s.field}>
          Store name
          <input
            name="name"
            required
            maxLength={100}
            placeholder="Everyday Goods"
          />
        </label>
        <label className={s.field}>
          Store website
          <input
            name="origin"
            required
            type="url"
            placeholder="https://yourstore.com"
          />
        </label>
      </div>
      <label className={s.checkbox}>
        <input type="checkbox" required />
        <span>
          I manage this store and authorize product, isolated cart and
          pre-payment checks. These can create test carts, but no orders or
          payments.
        </span>
      </label>
      <button className={s.primary} disabled={busy}>
        Save store & get verification tag
      </button>
    </form>
  );
}
function JourneyForm({ stores, existing, action, busy, close }) {
  const c = existing?.config;
  const [storeId, setStoreId] = useState(
      existing?.store_id || stores[0]?.id || "",
    ),
    [url, setUrl] = useState(c?.productUrl || ""),
    [variants, setVariants] = useState([]),
    [variantId, setVariantId] = useState(c?.variantId || ""),
    [price, setPrice] = useState(c ? String(c.expectedPricePaise / 100) : "");
  return (
    <form
      className={s.panel}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        action({
          action: "case.save",
          id: existing?.id,
          storeId,
          config: {
            label: f.get("label"),
            productUrl: url,
            variantId,
            expectedPrice: price,
            pin: f.get("pin"),
            province: f.get("province"),
            discount: f.get("discount"),
            expectedCart: f.get("expectedCart"),
            maxShipping: f.get("maxShipping"),
            confirmed: f.get("confirmed") === "on",
            expectedAvailable: true,
          },
        });
      }}
    >
      <div className={s.rowTop}>
        <h2>
          {existing ? "Edit your expected outcome." : "Save a buying journey."}
        </h2>
        <button type="button" className={s.quiet} onClick={close}>
          Close
        </button>
      </div>
      <p>
        Choose a product expected to be available. One unit is used in each
        check. Updating these rules starts a new baseline.
      </p>
      <div className={s.form}>
        <label className={s.field}>
          Store
          <select
            value={storeId}
            disabled={Boolean(existing)}
            onChange={(e) => {
              setStoreId(e.target.value);
              setVariants([]);
              setVariantId("");
              setUrl("");
              setPrice("");
            }}
          >
            {stores.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          Journey name
          <input
            name="label"
            required
            maxLength={100}
            defaultValue={c?.label}
            placeholder="Blue shirt · size M · welcome offer"
          />
        </label>
        <label className={`${s.field} ${s.full}`}>
          Product link
          <input
            type="url"
            required
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setVariants([]);
              setVariantId("");
            }}
            placeholder="https://yourstore.com/products/blue-shirt"
          />
        </label>
        <div className={s.full}>
          <button
            type="button"
            className={s.secondary}
            disabled={!url || busy}
            onClick={async () => {
              const r = await action({ action: "product.read", storeId, url });
              if (r?.variants) setVariants(r.variants);
            }}
          >
            Load product variants
          </button>
        </div>
        <label className={s.field}>
          Exact variant
          {variants.length ? (
            <select
              required
              value={variantId}
              onChange={(e) => {
                setVariantId(e.target.value);
                const v = variants.find((v) => v.id === e.target.value);
                if (Number.isInteger(v?.price)) setPrice(String(v.price / 100));
              }}
            >
              <option value="">Select a variant</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                  {v.available ? "" : " · unavailable"}
                </option>
              ))}
            </select>
          ) : (
            <input
              required
              value={variantId}
              inputMode="numeric"
              pattern="[1-9][0-9]{0,15}"
              onChange={(e) => setVariantId(e.target.value)}
              placeholder="Load above or paste Shopify variant ID"
            />
          )}
        </label>
        <label className={s.field}>
          Expected unit price · INR
          <input
            type="number"
            min="0.01"
            max="1000000"
            step="0.01"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className={s.field}>
          Delivery PIN code
          <input
            name="pin"
            required
            inputMode="numeric"
            pattern="[1-9][0-9]{5}"
            maxLength={6}
            defaultValue={c?.pin}
            placeholder="560001"
          />
        </label>
        <label className={s.field}>
          State / union territory
          <input
            name="province"
            required
            maxLength={60}
            defaultValue={c?.province}
            placeholder="Karnataka"
          />
        </label>
        <label className={s.field}>
          Discount code · optional
          <input
            name="discount"
            maxLength={60}
            defaultValue={c?.discount}
            placeholder="WELCOME10"
          />
        </label>
        <label className={s.field}>
          Expected subtotal after discount · INR
          <input
            name="expectedCart"
            type="number"
            min="0"
            max="1000000"
            step="0.01"
            defaultValue={
              c?.expectedCartPaise != null ? c.expectedCartPaise / 100 : ""
            }
            placeholder="Required if using a discount"
          />
        </label>
        <label className={s.field}>
          Maximum shipping estimate · INR
          <input
            name="maxShipping"
            type="number"
            min="0"
            max="100000"
            step="0.01"
            defaultValue={
              c?.maxShippingPaise != null ? c.maxShippingPaise / 100 : ""
            }
            placeholder="0 for free shipping, or leave blank"
          />
        </label>
      </div>
      <label className={s.checkbox}>
        <input type="checkbox" name="confirmed" required />
        <span>
          I confirm this variant should be available and these INR prices, offer
          and delivery rules are correct. An imported price is only a suggestion
          until I confirm it.
        </span>
      </label>
      <button className={s.primary} disabled={busy}>
        Save journey
      </button>
    </form>
  );
}
function Credits({ config, payments, action, busy }) {
  return (
    <>
      <section className={s.panel}>
        <h2>20 checks. No automatic renewal.</h2>
        <p>
          Each journey run or retest uses one credit. Weekly checks use the same
          balance. Infrastructure failures return the credit; completed reports
          can include steps that could not be verified.
        </p>
        {!config.enabled ? (
          <div className={s.status}>
            Payments are not open yet. Prepare your store and journeys now;
            pricing will be published here before you pay.
          </div>
        ) : (
          <div className={s.split}>
            <div>
              <h2>{formatMoney(config.amount * 100)}</h2>
              <p>Total for 20 check credits.</p>
              <Image
                unoptimized
                width={600}
                height={600}
                src={config.qrPath}
                className={s.qr}
                alt={`Original UPI QR for ${config.payee}`}
              />
              <p>
                Payee: <strong>{config.payee}</strong>
                <br />
                UPI ID: {config.upiId}
              </p>
              <a
                className={s.primary}
                href={`upi://pay?${new URLSearchParams({ pa: config.upiId, pn: config.payee, am: String(config.amount), cu: "INR", tn: "StockedBy Purchase Check 20 credits" })}`}
              >
                Open UPI app ↗
              </a>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                action({
                  action: "payment.submit",
                  reference: f.get("reference"),
                  accepted: f.get("accepted") === "on",
                });
              }}
            >
              <label className={s.field}>
                12-digit UPI reference / RRN
                <input
                  name="reference"
                  required
                  pattern="[0-9]{12}"
                  inputMode="numeric"
                  maxLength={12}
                />
              </label>
              <label className={s.checkbox}>
                <input type="checkbox" name="accepted" required />
                <span>
                  I paid the shown total for 20 check credits. I understand the
                  credits are added after a manual bank check, with no automatic
                  renewal.
                </span>
              </label>
              <button
                className={s.primary}
                disabled={busy || payments.some((p) => p.status === "pending")}
              >
                Submit payment reference
              </button>
              <p className={s.footnote}>
                Seller: {config.seller}. For incorrect, failed or duplicate
                payments, contact{" "}
                <a href={`mailto:${config.support}`}>{config.support}</a>. A
                submitted reference does not confirm payment.
              </p>
            </form>
          </div>
        )}
      </section>
      {payments.length > 0 && (
        <section className={s.panel}>
          <h2>Your payment requests</h2>
          {payments.map((p) => (
            <div className={s.row} key={p.id}>
              <div className={s.rowTop}>
                <span>{formatMoney(p.amount_inr * 100)}</span>
                <span className={s.badge}>{p.status}</span>
              </div>
              <p>
                {new Date(p.created_at).toLocaleDateString("en-IN")}
                {p.review_note ? ` · ${p.review_note}` : ""}
              </p>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

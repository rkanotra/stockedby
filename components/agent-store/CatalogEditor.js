"use client";
import { useState } from "react";
import Link from "next/link";
import {
  EMPTY_CATALOG,
  MAX_PRODUCTS,
  cleanCatalog,
  inspectCatalog,
  buildAgentCatalog,
} from "@/lib/agentStore/catalog";
import { trackEvent } from "@/lib/analytics";
import styles from "./storefront.module.css";
const blankProduct = () => ({
  sku: "",
  title: "",
  description: "",
  price: "",
  availability: "",
  url: "",
  image: "",
});
export default function CatalogEditor({
  initialStore = null,
  access = null,
  demo = false,
  history = [],
}) {
  const [catalog, setCatalog] = useState(
    initialStore?.draft || { ...EMPTY_CATALOG, products: [blankProduct()] },
  );
  const [store, setStore] = useState(initialStore);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [published, setPublished] = useState(
    initialStore?.published_at ? `/stores/${initialStore.id}` : "",
  );
  const checks = inspectCatalog(catalog);
  const change = (key, value) => {
    setCatalog((c) => ({ ...c, [key]: value }));
    setDirty(true);
  };
  const changeProduct = (i, key, value) => {
    setCatalog((c) => ({
      ...c,
      products: c.products.map((p, n) =>
        n === i ? { ...p, [key]: value } : p,
      ),
    }));
    setDirty(true);
  };
  async function action(path, method = "POST", body) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      return data;
    } catch (e) {
      setMessage(e.message || "Please try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (demo) {
      setMessage("Preview only. Sign in to save this catalog to your account.");
      return;
    }
    const data = await action("/api/agent-store", "PUT", cleanCatalog(catalog));
    if (data) {
      setStore(data.store);
      setDirty(false);
      setMessage("Draft saved. Publishing is a separate step.");
      trackEvent("agent_catalog_saved", {
        product_count: catalog.products.length,
      });
    }
  }
  async function verify() {
    const data = await action("/api/agent-store/verify");
    if (data) {
      setStore((s) => ({ ...s, verified_domain: s.draft.domain }));
      setMessage("Store ownership verified.");
    }
  }
  async function publish() {
    const data = await action("/api/agent-store/publish");
    if (data) {
      setPublished(data.url);
      setMessage(
        "Catalog published. Reconfirm price and stock at least every seven days.",
      );
      trackEvent("agent_catalog_published", {
        product_count: catalog.products.length,
      });
    }
  }
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          buildAgentCatalog(catalog, new Date().toISOString()),
          null,
          2,
        ),
      ],
      { type: "application/ld+json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stockedby-catalog-preview.json";
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("agent_catalog_exported", {
      product_count: catalog.products.length,
    });
  }
  const field = (key, label, multiline = false) => (
    <label className={`${styles.field} ${styles.wide}`} key={key}>
      {label}
      {multiline ? (
        <textarea
          className={styles.textarea}
          value={catalog[key]}
          maxLength={600}
          onChange={(e) => change(key, e.target.value)}
        />
      ) : (
        <input
          className={styles.input}
          value={catalog[key]}
          maxLength={key === "name" ? 100 : 250}
          onChange={(e) => change(key, e.target.value)}
          placeholder={key === "domain" ? "https://yourstore.in" : ""}
        />
      )}
    </label>
  );
  return (
    <>
      {demo && (
        <div className={styles.status}>
          Interactive preview. Your entries stay in this tab. Nothing is saved
          or published.
        </div>
      )}
      {message && (
        <div role="status" className={styles.status}>
          {message}
        </div>
      )}
      <div className={styles.workspace}>
        <section className={styles.panel}>
          <h2>Your store, in clear detail.</h2>
          <div className={styles.form}>
            {field("name", "Store name")}
            {field("domain", "Store website")}
            {field("delivery", "Delivery areas, cost and timing", true)}
            {field("returns", "Return and refund policy", true)}
          </div>
          {catalog.products.map((p, i) => (
            <div className={styles.product} key={i}>
              <div className={styles.productHead}>
                <h3>Product {i + 1}</h3>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    change(
                      "products",
                      catalog.products.filter((_, n) => n !== i),
                    );
                  }}
                >
                  Remove product {i + 1}
                </button>
              </div>
              <div className={styles.form}>
                {[
                  ["sku", "SKU / variant ID"],
                  ["title", "Product name"],
                  ["price", "Price in ₹"],
                  ["url", "Product page URL"],
                  ["image", "Image URL"],
                ].map(([key, label]) => (
                  <label
                    className={`${styles.field} ${["url", "image"].includes(key) ? styles.wide : ""}`}
                    key={key}
                  >
                    {label}
                    <input
                      className={styles.input}
                      value={p[key]}
                      inputMode={key === "price" ? "decimal" : undefined}
                      maxLength={
                        key === "price"
                          ? 12
                          : key === "sku"
                            ? 80
                            : key === "title"
                              ? 160
                              : 600
                      }
                      onChange={(e) => changeProduct(i, key, e.target.value)}
                    />
                  </label>
                ))}
                <label className={styles.field}>
                  Stock status
                  <select
                    className={styles.input}
                    value={p.availability}
                    onChange={(e) =>
                      changeProduct(i, "availability", e.target.value)
                    }
                  >
                    <option value="">Choose status</option>
                    <option value="InStock">In stock</option>
                    <option value="OutOfStock">Out of stock</option>
                    <option value="PreOrder">Preorder</option>
                  </select>
                </label>
                <label className={`${styles.field} ${styles.wide}`}>
                  Product description
                  <textarea
                    className={styles.textarea}
                    value={p.description}
                    maxLength={2000}
                    onChange={(e) =>
                      changeProduct(i, "description", e.target.value)
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.secondary}
              disabled={catalog.products.length >= MAX_PRODUCTS}
              onClick={() =>
                change("products", [...catalog.products, blankProduct()])
              }
            >
              Add a product
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={save}
            >
              {busy ? "Working…" : demo ? "Save to an account" : "Save draft"}
            </button>
          </div>
          <p className={styles.muted}>
            Up to 25 products or variants. Use one entry per SKU.
          </p>
        </section>
        <aside>
          <section className={styles.panel}>
            <div className={styles.kicker}>CATALOG CHECK</div>
            <h2>
              {checks.ready
                ? "Clear enough to publish."
                : "Give agents the missing details."}
            </h2>
            <p>
              {checks.ready
                ? "Every required product field is present. This checks completeness, not live price accuracy or AI discovery."
                : `${checks.issues.length} things to complete before publishing.`}
            </p>
            {checks.issues.length > 0 && (
              <ul className={styles.issues}>
                {checks.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className={styles.secondary}
              disabled={!checks.ready}
              onClick={download}
            >
              Download catalog preview
            </button>
            <details style={{ marginTop: 18 }}>
              <summary>See what an agent can read</summary>
              <pre className={styles.code}>
                {JSON.stringify(
                  buildAgentCatalog(catalog, new Date().toISOString()),
                  null,
                  2,
                )}
              </pre>
            </details>
          </section>
          <section className={styles.panel}>
            <div className={styles.kicker}>PUBLISH YOUR STOREFRONT</div>
            {demo ? (
              <>
                <h2>Ready for your own store?</h2>
                <p>
                  Save drafts for free. A paid pass adds hosting, ownership
                  verification and publication history.
                </p>
                <Link
                  href="/login?next=/dashboard/agent-store"
                  className={styles.primary}
                >
                  Create your workspace
                </Link>
              </>
            ) : (
              <>
                <h2>
                  {access?.active
                    ? "Your pass is active."
                    : "Activate when you’re ready."}
                </h2>
                <p>
                  {access?.active
                    ? `Hosting ends ${new Date(access.expiresAt).toLocaleDateString("en-IN")}. Drafts stay in your account.`
                    : "Prepare your catalog first. Publishing needs an active 30-day pass."}
                </p>
                {!access?.active && (
                  <Link href="/checkout/agent-store" className={styles.primary}>
                    View payment details
                  </Link>
                )}
                {store && (
                  <>
                    <h3 style={{ marginTop: 24 }}>Prove it’s your store</h3>
                    <p>
                      Add this tag inside your homepage’s head section. Publish
                      your theme, then verify.
                    </p>
                    <pre
                      className={styles.code}
                    >{`<meta name="stockedby-verification" content="${store.verification_token}" />`}</pre>
                    <button
                      type="button"
                      className={styles.secondary}
                      disabled={busy || dirty}
                      onClick={verify}
                    >
                      {store.verified_domain === catalog.domain
                        ? "Verify again"
                        : "Verify ownership"}
                    </button>
                  </>
                )}
                <p className={styles.muted}>
                  Publishing confirms these prices, stock details and policies
                  are current and makes them public. After seven days, the feed
                  hides offers until you publish a fresh confirmation.
                </p>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={
                    busy ||
                    dirty ||
                    !checks.ready ||
                    !access?.active ||
                    store?.verified_domain !== catalog.domain
                  }
                  onClick={publish}
                >
                  Confirm details & publish
                </button>
                {dirty && (
                  <p className={styles.muted}>
                    Save your changes before verifying or publishing.
                  </p>
                )}
                {published && (
                  <div className={styles.status}>
                    <a className={styles.link} href={published}>
                      Open published storefront ↗
                    </a>
                    <p>
                      Add a visible link to this page in your store footer so
                      agents can find it. Hosting alone does not guarantee
                      discovery.
                    </p>
                    <pre
                      className={styles.code}
                    >{`<a href="https://stockedby.com${published}">Product catalog for AI assistants</a>`}</pre>
                  </div>
                )}
              </>
            )}
          </section>
          {history.length > 0 && (
            <section className={styles.panel}>
              <h3>Publication history</h3>
              <ul className={styles.issues}>
                {history.map((h) => (
                  <li key={h.id}>
                    {new Date(h.published_at).toLocaleString("en-IN")} ·{" "}
                    {h.product_count} products
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

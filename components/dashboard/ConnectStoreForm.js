"use client";

import { useState } from "react";
import styles from "../test/test.module.css";

// Kicks off the Shopify OAuth flow (GET /api/shopify/install?shop=...) —
// a real navigation, not a fetch, since Shopify's authorize page has to
// load in the same top-level browsing context.
export default function ConnectStoreForm() {
  const [shop, setShop] = useState("");
  const [error, setError] = useState("");

  function submit(e) {
    e.preventDefault();
    const trimmed = shop.trim().toLowerCase();
    if (!trimmed) return;
    const domain = trimmed.includes(".") ? trimmed : `${trimmed}.myshopify.com`;
    if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain)) {
      setError("Enter your shop's myshopify.com domain, e.g. your-store.myshopify.com");
      return;
    }
    setError("");
    // A real full-page navigation, not client-side routing: this path is a
    // Route Handler that itself redirects on to Shopify's own (external)
    // authorize page — router.push() would treat it as an internal
    // transition and never actually leave the SPA to reach Shopify.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/shopify/install?shop=${encodeURIComponent(domain)}`;
  }

  return (
    <form className={styles.gateForm} onSubmit={submit}>
      <label htmlFor="shopify-domain" className={styles.label}>Your Shopify domain</label>
      <input
        id="shopify-domain"
        type="text"
        placeholder="your-store.myshopify.com"
        className={styles.input}
        value={shop}
        onChange={(e) => setShop(e.target.value)}
      />
      {error && <div className={styles.errBanner}>{error}</div>}
      <button type="submit" className={styles.btn}>
        Connect Shopify store
      </button>
    </form>
  );
}

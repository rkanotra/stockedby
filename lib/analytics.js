"use client";
import { safeAnalyticsParams } from "./analyticsPolicy";
export function trackEvent(name, params = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function")
    return;
  try {
    if (localStorage.getItem("stockedby_analytics") !== "granted") return;
    window.gtag("event", name, safeAnalyticsParams(params));
  } catch {
    /* Analytics must never interrupt a product action. */
  }
}

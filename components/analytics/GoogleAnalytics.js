"use client";
import Script from "next/script";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { analyticsPath, validMeasurementId } from "@/lib/analyticsPolicy";
import styles from "./analytics.module.css";
const KEY = "stockedby_analytics";
function subscribe(callback) {
  window.addEventListener("stockedby-consent", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("stockedby-consent", callback);
    window.removeEventListener("storage", callback);
  };
}
function snapshot() {
  try {
    return localStorage.getItem(KEY) || "unset";
  } catch {
    return "denied";
  }
}
function serverSnapshot() {
  return "unset";
}
export default function GoogleAnalytics({ measurementId }) {
  const consent = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [ready, setReady] = useState(false),
    [settings, setSettings] = useState(false);
  const lastPath = useRef(null);
  const pathname = usePathname();
  const valid = validMeasurementId(measurementId);
  function choose(value) {
    try {
      localStorage.setItem(KEY, value);
      window.dispatchEvent(new Event("stockedby-consent"));
    } catch {}
    setSettings(false);
    window["ga-disable-" + measurementId] = value === "denied";
    if (value === "denied") {
      window.gtag?.("consent", "update", { analytics_storage: "denied" });
      lastPath.current = null;
    }
  }
  useEffect(() => {
    if (!ready || consent !== "granted") return;
    const path = analyticsPath(pathname);
    if (!path || path === lastPath.current) return;
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("set", {
      page_location: window.location.origin + path,
      page_title: path,
      page_referrer: lastPath.current
        ? window.location.origin + lastPath.current
        : "",
    });
    window.gtag("event", "page_view", {
      page_location: window.location.origin + path,
      page_title: path,
      page_referrer: lastPath.current
        ? window.location.origin + lastPath.current
        : "",
    });
    lastPath.current = path;
  }, [pathname, ready, consent]);
  if (!valid) return null;
  return (
    <>
      {consent === "granted" && (
        <>
          <Script
            id="stockedby-ga-init"
            strategy="afterInteractive"
          >{`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments);};gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});gtag('js',new Date());gtag('config','${measurementId}',{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:window.location.origin+${JSON.stringify(analyticsPath(pathname) || "/")},page_title:'StockedBy',page_referrer:''});`}</Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
            strategy="afterInteractive"
            onReady={() => setReady(true)}
          />
        </>
      )}
      {consent === "unset" || settings ? (
        <section className={styles.banner} aria-label="Analytics preferences">
          <div>
            <strong>Help us understand what’s useful.</strong>
            <p>
              Allow Google Analytics to measure visits and feature use? Your
              catalog entries, email and payment references are excluded.{" "}
              <a href="/privacy">Privacy details</a>
            </p>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => choose("denied")}>
              No thanks
            </button>
            <button type="button" onClick={() => choose("granted")}>
              Allow analytics
            </button>
          </div>
        </section>
      ) : (
        <button
          type="button"
          className={styles.settings}
          onClick={() => setSettings(true)}
        >
          Analytics preferences
        </button>
      )}
    </>
  );
}

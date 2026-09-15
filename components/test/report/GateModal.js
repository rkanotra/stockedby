"use client";

import { useEffect, useRef } from "react";
import styles from "../test.module.css";

// Centered modal (desktop) / full-screen bottom sheet (mobile, via
// .gateModalPanel's own media query in test.module.css) — opens the
// moment "See full report" is clicked (LeadGate.js mounts this
// immediately, unlocked=false), so the email gate is never something a
// merchant has to scroll down past a blurred teaser to discover.
export default function GateModal({ onClose, children }) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector("input:not([readonly]), button")?.focus();
    function onKeyDown(e) {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab") return;
      const elements = Array.from(panelRef.current?.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea, select, a[href], [tabindex="0"]') || []).filter((element) => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        e.preventDefault(); last?.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        e.preventDefault(); first?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <div className={styles.gateModalOverlay} onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className={styles.gateModalPanel}
        role="dialog"
        aria-modal="true"
        aria-label="Unlock your full report"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.gateModalClose} onClick={onClose} aria-label="Close">
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}

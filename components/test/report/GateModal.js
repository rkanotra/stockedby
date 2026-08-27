"use client";

import { useEffect } from "react";
import styles from "../test.module.css";

// Centered modal (desktop) / full-screen bottom sheet (mobile, via
// .gateModalPanel's own media query in test.module.css) — opens the
// moment "See full report" is clicked (LeadGate.js mounts this
// immediately, unlocked=false), so the email gate is never something a
// merchant has to scroll down past a blurred teaser to discover.
export default function GateModal({ onClose, children }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className={styles.gateModalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.gateModalPanel}
        role="dialog"
        aria-modal="true"
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

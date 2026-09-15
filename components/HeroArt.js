"use client";

import { useEffect, useRef, useState } from "react";

// Small, original, commerce-themed decorative composition for the hero
// (visual/creative revamp — see CLAUDE.md's "Site philosophy"). Purely
// decorative: a soft pearlescent ribbon plus a few unbranded product
// silhouettes (a skincare bottle, a shoe, a shipping box) as static line
// art — no logos, no numbers, no claims. aria-hidden throughout; the
// only real control here is the "Pause animations" button, which is NOT
// hidden from assistive tech.
//
// Motion budget: only two layers ever drift (the ribbon, one soft accent
// blob) plus a separate highlight sweeping across the ribbon — the
// product silhouettes themselves never animate. Every layer here is a
// plain transform/opacity on a radial/linear-gradient background, never
// a blurred filter — an earlier version used animated SVG feGaussianBlur
// filters for the soft edges and it made the tab unresponsive (filtered
// content has to be fully re-rastered every animation frame). All
// motion respects prefers-reduced-motion, pauses when the hero scrolls
// offscreen or the tab is hidden, and can be paused by the visitor.
export default function HeroArt() {
  const sceneRef = useRef(null);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(true);
  const [docVisible, setDocVisible] = useState(true);
  const [prefersReduced, setPrefersReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => setPrefersReduced(e.matches);
    mq.addEventListener("change", onChange);

    const el = sceneRef.current;
    const io = el
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.1 })
      : null;
    if (el && io) io.observe(el);

    const onVisibility = () => setDocVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      mq.removeEventListener("change", onChange);
      if (io) io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const animate = !prefersReduced && !paused && inView && docVisible;

  return (
    <>
      <div className="hero-art" ref={sceneRef} data-animate={animate ? "on" : "off"} aria-hidden="true">
        <div className="hero-art-blob" />
        <div className="hero-art-ribbon">
          <div className="hero-art-sheen" />
        </div>
        {/* product silhouettes — each a small, independently-positioned
            icon (not one shared viewBox) so placement stays predictable
            no matter how tall the hero ends up on a given screen. */}
        <span className="hero-art-product hero-art-product-bottle">
          <svg viewBox="0 0 54 112" width="40" height="82" fill="none" stroke="#282139" strokeOpacity="0.24" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
            <rect x="0" y="26" width="54" height="86" rx="12" />
            <rect x="16" y="6" width="22" height="22" rx="4" />
            <line x1="0" y1="64" x2="54" y2="64" />
          </svg>
        </span>
        <span className="hero-art-product hero-art-product-box">
          <svg viewBox="0 0 92 70" width="66" height="50" fill="none" stroke="#282139" strokeOpacity="0.24" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
            <rect x="0" y="0" width="92" height="70" rx="6" />
            <line x1="0" y1="24" x2="92" y2="24" />
            <line x1="46" y1="0" x2="46" y2="24" />
          </svg>
        </span>
        <span className="hero-art-product hero-art-product-shoe">
          <svg viewBox="0 0 164 58" width="94" height="34" fill="none" stroke="#282139" strokeOpacity="0.24" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
            <path d="M4 44 C 4 24, 26 8, 54 10 C 78 12, 92 6, 112 4 C 124 3, 132 10, 130 20 C 128 34, 138 40, 152 42 C 160 43, 164 48, 160 54 L 8 54 C 3 54, 2 50, 4 44 Z" />
            <line x1="30" y1="18" x2="46" y2="30" />
            <line x1="48" y1="14" x2="64" y2="28" />
          </svg>
        </span>
      </div>

      {!prefersReduced && (
        <button
          type="button"
          className="motion-toggle mono"
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? "▸ Play animations" : "II Pause animations"}
        </button>
      )}
    </>
  );
}

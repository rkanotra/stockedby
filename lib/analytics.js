"use client";

// No Google Analytics script is wired into app/layout.js yet — setting up
// a real GA property + NEXT_PUBLIC_GA_ID + the gtag.js script tag is an ops
// decision (which property, whose account) outside this file's scope, same
// category as the Resend sending domain / Zoho mailbox setup elsewhere in
// this repo. This function is the code-side half: it fires real events the
// moment GA *is* wired up, and safely no-ops (never throws, never blocks
// the UI) until then, so /fix's event calls are correct today and don't
// need touching later.
export function trackEvent(name, params = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  try {
    window.gtag("event", name, params);
  } catch {
    // analytics must never break the product
  }
}

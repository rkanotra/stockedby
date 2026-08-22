import { Resend } from "resend";
import { SITE_URL } from "./site";

// Server-only (hard rule 1). Mirrors docs/api-lead-resend.ts's two-email
// shape (founder notification + merchant confirmation) with the merchant's
// /report/[slug] link added to both, now that reports persist (lib/reports.js).
let _resend = null;
function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

// Same escaping approach as docs/api-lead-resend.ts's safe() (strip/limit
// merchant-controlled text before interpolating into HTML), extended to
// also escape &, ", ' — every field here (brand, category, painpoint...) is
// user-entered and lands directly in an HTML email body.
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .slice(0, 2000);
}

// Both sends are best-effort and independent — a founder-notification
// failure shouldn't block the merchant's confirmation, or vice versa.
// Caller (app/api/lead/route.js) already treats the whole email step as
// non-fatal per hard rule 8: "if Resend fails, still unlock and still save
// the lead."
export async function sendLeadEmails({ email, brand, market, category, painpoint, verdict, reportSlug }) {
  const client = resend();
  if (!client) {
    console.log("[email] RESEND_API_KEY not set — skipping send (lead already saved).");
    return { founderSent: false, merchantSent: false };
  }

  const fromEmail = process.env.FROM_EMAIL || "StockedBy <onboarding@resend.dev>";
  const founderEmail = process.env.FOUNDER_EMAIL;
  const reportUrl = reportSlug ? `${SITE_URL}/report/${reportSlug}` : null;

  const results = await Promise.allSettled([
    founderEmail
      ? client.emails.send({
          from: fromEmail,
          to: founderEmail,
          subject: `🛒 New StockedBy lead: ${esc(brand)} (${esc(market)}) — ${esc(verdict)}`,
          html: `
            <h2>New merchant unlocked a report</h2>
            <table cellpadding="6" style="font-family:monospace">
              <tr><td><b>Email</b></td><td>${esc(email)}</td></tr>
              <tr><td><b>Brand</b></td><td>${esc(brand)}</td></tr>
              <tr><td><b>Category</b></td><td>${esc(category)}</td></tr>
              <tr><td><b>Market</b></td><td>${esc(market)}</td></tr>
              <tr><td><b>Verdict</b></td><td>${esc(verdict)}</td></tr>
              ${reportUrl ? `<tr><td><b>Report</b></td><td><a href="${reportUrl}">${reportUrl}</a></td></tr>` : ""}
            </table>
            <h3>Pain point (their words)</h3>
            <blockquote style="border-left:3px solid #FFC53D;padding-left:12px">
              ${esc(painpoint) || "(left blank)"}
            </blockquote>`,
        })
      : Promise.resolve({ error: { message: "skipped: FOUNDER_EMAIL not set" } }),
    client.emails.send({
      from: fromEmail,
      to: email,
      subject: `Your AI shelf report for ${esc(brand)} — ${esc(verdict)}`,
      html: `
        <p>Hi,</p>
        <p>Your StockedBy test for <b>${esc(brand)}</b> in ${esc(category)} (${esc(market)}) is done:
        verdict <b>${esc(verdict)}</b>.</p>
        ${reportUrl ? `<p><a href="${reportUrl}">View your full report</a> — this link is yours to keep or share.</p>` : ""}
        <p>AI shopping answers shift every few weeks — we recommend re-testing monthly.</p>
        <p>You told us your biggest pain point — we read every one of these personally
        and it shapes what we build next.</p>
        <p>— StockedBy</p>`,
    }),
  ]);

  return {
    founderSent: results[0].status === "fulfilled" && !results[0].value?.error,
    merchantSent: results[1].status === "fulfilled" && !results[1].value?.error,
  };
}

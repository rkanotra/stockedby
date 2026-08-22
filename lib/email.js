import { Resend } from "resend";
import { SITE_URL } from "./site";
import { matches } from "./scoring";

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

// Merchant email = Layer-1 content only + link (report simplification spec)
// — the same four-card story components/test/report/StoryView.js renders,
// built from the same lib/layerOne.js functions so the email can never say
// something different from what the report page shows. `layer1` is the
// return value of lib/layerOne.js's buildLayerOne(); app/api/lead/route.js
// computes it from the saved report (may be null if the report couldn't be
// loaded — e.g. Supabase wasn't configured when the test ran), in which
// case this falls back to a plain verdict-only line.
function buildMerchantEmailHtml({ brand, category, market, verdict, layer1, reportUrl }) {
  const reportLine = reportUrl
    ? `<p><a href="${reportUrl}">See your full report</a> — this link is yours to keep or share.</p>`
    : "";

  if (!layer1) {
    return `
      <p>Hi,</p>
      <p>Your StockedBy test for <b>${esc(brand)}</b> in ${esc(category)} (${esc(market)}) is done:
      verdict <b>${esc(verdict)}</b>.</p>
      ${reportLine}
      <p>— StockedBy</p>`;
  }

  const { appearance, brands, destinations, actions } = layer1;
  const brandRows = brands.top
    .map((b) => `<li>${esc(b.label)}${matches(brand, b.label) ? " (you)" : ""}</li>`)
    .join("");
  const missingLine = !brands.brandInTop && brands.top.length > 0 ? `<p>${esc(brand)} is missing from this list.</p>` : "";
  const destLine =
    destinations.others > destinations.yours && destinations.topOtherDomain
      ? `<p>Buyers go to ${esc(destinations.topOtherDomain)}. That shop takes commission from your sale.</p>`
      : "";
  const actionRows = actions
    .map((a) => (a.href ? `<li><a href="${SITE_URL}${a.href}">${esc(a.text)}</a></li>` : `<li>${esc(a.text)}</li>`))
    .join("");

  return `
    <p>Hi,</p>
    <p>Your StockedBy report for <b>${esc(brand)}</b> in ${esc(category)} (${esc(market)}) is ready.</p>

    <h3>Do AI apps recommend ${esc(brand)}?</h3>
    <p><b>${esc(appearance.verdict)}</b> — you appeared in ${appearance.appearedIn} of
    ${appearance.totalAttempted} shopper questions.</p>

    <h3>Who does AI recommend?</h3>
    <ul>${brandRows}</ul>
    ${missingLine}

    <h3>Where does AI send buyers to pay?</h3>
    <p>Your shop: ${destinations.yours} times · Other shops: ${destinations.others} times</p>
    ${destLine}

    <h3>What should you do now?</h3>
    <ul>${actionRows}</ul>

    ${reportLine}
    <p>— StockedBy</p>`;
}

// Both sends are best-effort and independent — a founder-notification
// failure shouldn't block the merchant's confirmation, or vice versa.
// Caller (app/api/lead/route.js) already treats the whole email step as
// non-fatal per hard rule 8: "if Resend fails, still unlock and still save
// the lead."
export async function sendLeadEmails({ email, brand, market, category, painpoint, verdict, reportSlug, layer1 }) {
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
      html: buildMerchantEmailHtml({ brand, category, market, verdict, layer1, reportUrl }),
    }),
  ]);

  return {
    founderSent: results[0].status === "fulfilled" && !results[0].value?.error,
    merchantSent: results[1].status === "fulfilled" && !results[1].value?.error,
  };
}

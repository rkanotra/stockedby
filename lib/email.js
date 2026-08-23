import { Resend } from "resend";
import { SITE_URL } from "./site";
import { MARKET_LABELS } from "./scoring";

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

// Verdict-aware subject — keyed off the Layer 1 appearance verdict
// (YES/SOMETIMES/NO, lib/layerOne.js's buildAppearanceStory), not the
// full 4-tier report.verdict: this is specifically about whether AI
// mentioned the brand at all, which is what the subject line promises to
// explain. Falls back to the NO case's subject when layer1 couldn't be
// loaded — the safe, still-honest default ("here's why") rather than
// claiming a verdict we don't actually have.
function subjectFor(brand, layer1) {
  const verdict = layer1?.appearance?.verdict;
  if (verdict === "YES") return `${brand}: AI recommends you — but check where it sends buyers`;
  if (verdict === "SOMETIMES") return `${brand}: AI mentions you sometimes — here's what's missing`;
  return `${brand}: AI is not recommending you yet — here's why`;
}

// The email's own opening line — same three verdicts, same treatment,
// just phrased as a direct statement rather than the report card's big
// YES/SOMETIMES/NO word (this is a paragraph a person reads top to
// bottom, not a scannable card).
function appearanceLine({ verdict, appearedIn, totalAttempted }) {
  if (verdict === "YES") return "Your brand came up every time we asked.";
  if (verdict === "SOMETIMES") return `Your brand came up sometimes — ${appearedIn} of ${totalAttempted} times.`;
  return "Your brand didn't come up.";
}

// Injects a real <a> for the one tip (lib/layerOne.js's buildEmailTips,
// index 1) that carries a literal "stockedby.com/audit" mention — split
// around it so the surrounding text still gets escaped normally.
function tipToHtml(tip) {
  const marker = "stockedby.com/audit";
  const idx = tip.indexOf(marker);
  if (idx === -1) return esc(tip);
  const before = tip.slice(0, idx);
  const after = tip.slice(idx + marker.length);
  return `${esc(before)}<a href="${SITE_URL}/audit">${marker}</a>${esc(after)}`;
}

// Merchant email — a plain, personal email a real person could have typed,
// not a marketing template: one-line verdict, who won instead, the money
// line (only when it's actually true), three concrete tips built from
// THEIR own data (lib/layerOne.js's buildEmailTips — same underlying
// signals as the on-screen report, so the email can never say something
// the report doesn't back up), a plain link to the full report, and a
// sign-off that invites a reply. Same structure for every verdict — only
// the subject and opening line change. Returns {subject, html, text}
// together since they share every input; `layer1` may be null (report
// couldn't be loaded — e.g. Supabase wasn't configured when the test ran),
// in which case this falls back to a short, honest, data-free version.
export function buildMerchantEmail({ brand, category, market, layer1, reportUrl, brandWebsite }) {
  const marketLabel = MARKET_LABELS[market] || market;
  const subject = subjectFor(brand, layer1);
  const reportLineText = reportUrl ? `See your full report: ${reportUrl}\n\n` : "";
  const reportLineHtml = reportUrl ? `<p><a href="${reportUrl}">See your full report</a></p>` : "";
  // Multi-category cross-sell (parallel to StoryView.js's TestAnotherCTA
  // card) — carries domain+brand+market so /test's wizard can skip
  // straight to the category step for this same brand instead of asking
  // them to re-enter what's already known.
  const nextProductUrl = brandWebsite
    ? `${SITE_URL}/test?${new URLSearchParams({ domain: brandWebsite, brand, market }).toString()}`
    : null;
  const nextProductLineText = nextProductUrl
    ? `You can test your other products free too — ${nextProductUrl}.\n\n`
    : "";
  const nextProductLineHtml = nextProductUrl
    ? `<p>You can test your other products free too — <a href="${nextProductUrl}">test another product</a>.</p>`
    : "";
  const signOff =
    "Reply to this email if you want help fixing this — a real person reads every reply.\n\n— Rahul, StockedBy";
  const signOffHtml =
    "<p>Reply to this email if you want help fixing this — a real person reads every reply.</p><p>— Rahul, StockedBy</p>";

  if (!layer1) {
    return {
      subject,
      text: `Hi,\n\nYour StockedBy test for ${brand} in ${category} (${marketLabel}) is done.\n\n${reportLineText}${nextProductLineText}${signOff}`,
      html: `<p>Hi,</p><p>Your StockedBy test for <b>${esc(brand)}</b> in ${esc(category)} (${esc(marketLabel)}) is done.</p>${reportLineHtml}${nextProductLineHtml}${signOffHtml}`,
    };
  }

  const { appearance, brands, destinations, emailTips } = layer1;
  const opening = appearanceLine(appearance);
  const brandNames = brands.top.map((b) => b.label);
  const brandsLine = brandNames.length > 0 ? `AI recommended: ${brandNames.join(", ")}.` : "";
  const showMoneyLine = destinations.others > destinations.yours && destinations.topOtherDomain;
  const moneyLine = showMoneyLine
    ? `When AI does send buyers to pay, they go to ${destinations.topOtherDomain} — not your website.`
    : "";

  const textParts = [
    "Hi,",
    "",
    `We asked ChatGPT, Gemini and Claude what shoppers should buy in ${category} in ${marketLabel}.`,
    opening,
    "",
  ];
  if (brandsLine) textParts.push(brandsLine, "");
  if (moneyLine) textParts.push(moneyLine, "");
  textParts.push("Three things to try:");
  emailTips.forEach((tip, i) => textParts.push(`${i + 1}. ${tip}`));
  textParts.push("");
  if (reportLineText) textParts.push(reportLineText.trim(), "");
  if (nextProductLineText) textParts.push(nextProductLineText.trim(), "");
  textParts.push(signOff);

  const htmlParts = [
    "<p>Hi,</p>",
    `<p>We asked ChatGPT, Gemini and Claude what shoppers should buy in ${esc(category)} in ${esc(marketLabel)}.<br>${esc(opening)}</p>`,
  ];
  if (brandsLine) htmlParts.push(`<p>${esc(brandsLine)}</p>`);
  if (moneyLine) htmlParts.push(`<p>${esc(moneyLine)}</p>`);
  htmlParts.push(
    "<p>Three things to try:</p>",
    `<ol>${emailTips.map((t) => `<li>${tipToHtml(t)}</li>`).join("")}</ol>`
  );
  if (reportLineHtml) htmlParts.push(reportLineHtml);
  if (nextProductLineHtml) htmlParts.push(nextProductLineHtml);
  htmlParts.push(signOffHtml);

  return { subject, text: textParts.join("\n"), html: htmlParts.join("\n") };
}

// Both sends are best-effort and independent — a founder-notification
// failure shouldn't block the merchant's confirmation, or vice versa.
// Caller (app/api/lead/route.js) already treats the whole email step as
// non-fatal per hard rule 8: "if Resend fails, still unlock and still save
// the lead."
export async function sendLeadEmails({
  email,
  brand,
  market,
  category,
  painpoint,
  verdict,
  reportSlug,
  layer1,
  brandWebsite,
}) {
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
    (() => {
      const merchantEmail = buildMerchantEmail({ brand, category, market, layer1, reportUrl, brandWebsite });
      return client.emails.send({
        from: fromEmail,
        to: email,
        subject: merchantEmail.subject,
        html: merchantEmail.html,
        text: merchantEmail.text,
      });
    })(),
  ]);

  return {
    founderSent: results[0].status === "fulfilled" && !results[0].value?.error,
    merchantSent: results[1].status === "fulfilled" && !results[1].value?.error,
  };
}

// Fix Generator's merchant confirmation (app/fix, /api/fix, hard rule 8's
// gate extended to source="fix"). No report/verdict here to summarize —
// the client already unlocks the full product set + llms.txt
// presentationally the moment this lead is saved (same LeadGate pattern as
// reports), so this email is a receipt plus the "we'll install it for
// you" reply invitation from spec item (7)/(9), not a second delivery
// mechanism.
function buildFixLeadEmail({ domain, platform }) {
  const subject = `${domain}: your AI fix is ready`;
  const platformLine = platform ? ` (built on ${platform})` : "";
  const signOff =
    "Don't have a developer? Reply to this email — we'll install it for you.\n\n— Rahul, StockedBy";
  const signOffHtml =
    "<p>Don't have a developer? Reply to this email — we'll install it for you.</p><p>— Rahul, StockedBy</p>";
  return {
    subject,
    text: `Hi,\n\nWe checked ${domain}${platformLine} and generated the fix — product listings AI shopping tools can read, plus an llms.txt file. It's ready on the page you were just on.\n\n${signOff}`,
    html: `<p>Hi,</p><p>We checked <b>${esc(domain)}</b>${esc(platformLine)} and generated the fix — product listings AI shopping tools can read, plus an llms.txt file. It's ready on the page you were just on.</p>${signOffHtml}`,
  };
}

export async function sendFixLeadEmails({ email, domain, platform, painpoint }) {
  const client = resend();
  if (!client) {
    console.log("[email] RESEND_API_KEY not set — skipping send (lead already saved).");
    return { founderSent: false, merchantSent: false };
  }

  const fromEmail = process.env.FROM_EMAIL || "StockedBy <onboarding@resend.dev>";
  const founderEmail = process.env.FOUNDER_EMAIL;

  const results = await Promise.allSettled([
    founderEmail
      ? client.emails.send({
          from: fromEmail,
          to: founderEmail,
          subject: `New Fix Generator lead: ${esc(domain)}`,
          html: `
            <h2>New merchant unlocked a fix</h2>
            <table cellpadding="6" style="font-family:monospace">
              <tr><td><b>Email</b></td><td>${esc(email)}</td></tr>
              <tr><td><b>Domain</b></td><td>${esc(domain)}</td></tr>
              <tr><td><b>Platform</b></td><td>${esc(platform) || "unknown"}</td></tr>
            </table>
            <h3>Pain point (their words)</h3>
            <blockquote style="border-left:3px solid #FFC53D;padding-left:12px">
              ${esc(painpoint) || "(left blank)"}
            </blockquote>`,
        })
      : Promise.resolve({ error: { message: "skipped: FOUNDER_EMAIL not set" } }),
    (() => {
      const fixEmail = buildFixLeadEmail({ domain, platform });
      return client.emails.send({
        from: fromEmail,
        to: email,
        subject: fixEmail.subject,
        html: fixEmail.html,
        text: fixEmail.text,
      });
    })(),
  ]);

  return {
    founderSent: results[0].status === "fulfilled" && !results[0].value?.error,
    merchantSent: results[1].status === "fulfilled" && !results[1].value?.error,
  };
}

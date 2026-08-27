import { Resend } from "resend";
import { SITE_URL } from "./site";
import { MARKET_LABELS, categoryMidSentence } from "./scoring";
import { getInstallInstructions } from "./audit/installInstructions";
import { platformLabel } from "./audit/platform";
import { INK } from "./theme";

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

// Dynamic subject — keyed off the real, strongest result (CLAUDE.md's
// redesign phase, brief section 63), not a fixed 3-way split: whether AI
// mentioned the brand at all (layer1.appearance.verdict — Claude's live
// run, same signal the report's own headline uses), whether a real gap
// exists (founder.biggestOpportunity), whether a real competitor is the
// dominant story, and whether buyers are actually being sent elsewhere.
// Falls back to the weak/absent case when founder data couldn't be
// loaded — the safe, still-honest default rather than claiming a result
// we don't actually have.
function subjectFor(brand, layer1, founder) {
  const verdict = layer1?.appearance?.verdict;
  if (verdict !== "YES" && verdict !== "SOMETIMES") {
    return `AI isn't recommending ${brand} yet`;
  }
  if (!founder?.biggestOpportunity) {
    return `${brand} is winning AI recommendations`;
  }
  const destProblem = founder.destinationSplit && founder.destinationSplit.marketplacePct > founder.destinationSplit.ownSitePct;
  if (destProblem && verdict === "YES") {
    return `AI recommends ${brand} — but shoppers are being sent elsewhere`;
  }
  if (founder.competitorThreat?.label) {
    return `${founder.competitorThreat.label} is beating ${brand} in AI recommendations`;
  }
  return `${brand} is visible in AI — but competitors are winning discovery`;
}

const PREHEADER = "See who's winning instead, where shoppers are sent and what to fix first.";

// The email's own opening line — same signal the report's headline uses,
// phrased as a direct statement a person reads top to bottom.
function appearanceLine({ verdict, appearedIn, totalAttempted }) {
  if (verdict === "YES") return "Your brand came up every time we asked.";
  if (verdict === "SOMETIMES") return `Your brand came up sometimes — ${appearedIn} of ${totalAttempted} times.`;
  return "Your brand didn't come up.";
}

// Merchant email — the founder-first redesign's brief (section 62): the
// email is NOT the report, its job is to explain the main result and
// make the founder want to open it. ~150-250 words: one verdict line,
// one biggest gap, three short actions, one primary CTA, one secondary
// text CTA into /audit. Every number comes from lib/founderReport.js
// (Phase 1) — the same functions /test and the PDF read, so this email
// can never say something the report doesn't back up. `founder` may be
// null (report data couldn't be loaded — e.g. Supabase wasn't configured
// when the test ran), in which case this falls back to a short, honest,
// data-free version.
export function buildMerchantEmail({ brand, category, market, layer1, founder, reportUrl, brandWebsite }) {
  const marketLabel = MARKET_LABELS[market] || market;
  const subject = subjectFor(brand, layer1, founder);
  const reportLineText = reportUrl ? `View my AI visibility report: ${reportUrl}\n\n` : "";
  const reportLineHtml = reportUrl
    ? `<p><a href="${reportUrl}" style="color:${INK.accent};font-weight:700">View my AI visibility report →</a></p>`
    : "";
  const auditUrl = `${SITE_URL}/audit${brandWebsite ? `?domain=${encodeURIComponent(brandWebsite)}` : ""}`;
  const auditLineText = `Run the free AI Store Audit: ${auditUrl}\n\n`;
  const auditLineHtml = `<p><a href="${auditUrl}" style="color:${INK.textSecondary}">Run the free AI Store Audit →</a></p>`;
  const signOff =
    "Have a question about the result? Reply to this email — we read every reply.\n\n— Rahul, StockedBy";
  const signOffHtml =
    "<p>Have a question about the result? Reply to this email — we read every reply.</p><p>— Rahul, StockedBy</p>";

  if (!layer1 || !founder) {
    return {
      subject,
      preheader: PREHEADER,
      text: `Hi,\n\nYour StockedBy test for ${brand} in ${categoryMidSentence(category)} (${marketLabel}) is done.\n\n${reportLineText}${auditLineText}${signOff}`,
      html: `<p>Hi,</p><p>Your StockedBy test for <b>${esc(brand)}</b> in ${esc(categoryMidSentence(category))} (${esc(marketLabel)}) is done.</p>${reportLineHtml}${auditLineHtml}${signOffHtml}`,
    };
  }

  const opening = appearanceLine(layer1.appearance);
  const gap = founder.biggestOpportunity;

  const textParts = [
    "Hi,",
    "",
    `We tested how ${brand} appears when shoppers ask ChatGPT, Gemini and Claude what ${categoryMidSentence(category)} to buy in ${marketLabel}.`,
    opening,
    "",
  ];
  if (gap) textParts.push("Biggest gap", gap.title, "");
  if (founder.actions.length > 0) {
    textParts.push("What to focus on next:");
    founder.actions.forEach((a, i) => textParts.push(`${i + 1}. ${a.title} — ${a.detail}`));
    textParts.push("");
  }
  textParts.push(reportLineText.trim(), auditLineText.trim(), "", signOff);

  const htmlParts = [
    "<p>Hi,</p>",
    `<p>We tested how <b>${esc(brand)}</b> appears when shoppers ask ChatGPT, Gemini and Claude what ${esc(categoryMidSentence(category))} to buy in ${esc(marketLabel)}.<br>${esc(opening)}</p>`,
  ];
  if (gap) {
    htmlParts.push(`<p><b>Biggest gap</b><br>${esc(gap.title)}</p>`);
  }
  if (founder.actions.length > 0) {
    htmlParts.push(
      "<p><b>What to focus on next</b></p>",
      `<ol>${founder.actions.map((a) => `<li><b>${esc(a.title)}</b> — ${esc(a.detail)}</li>`).join("")}</ol>`
    );
  }
  htmlParts.push(reportLineHtml, auditLineHtml, signOffHtml);

  return { subject, preheader: PREHEADER, text: textParts.join("\n"), html: htmlParts.join("\n") };
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
  founder,
  brandWebsite,
  pdfBuffer,
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
            <blockquote style="border-left:3px solid ${INK.accent};padding-left:12px">
              ${esc(painpoint) || "(left blank)"}
            </blockquote>`,
        })
      : Promise.resolve({ error: { message: "skipped: FOUNDER_EMAIL not set" } }),
    (() => {
      const merchantEmail = buildMerchantEmail({ brand, category, market, layer1, founder, reportUrl, brandWebsite });
      // Restrained premium HTML (brief section 68): fixed 600px content
      // width, one clean result highlight, a hidden preheader (the line
      // most inboxes show next to the subject) that never just repeats it.
      const html = [
        `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(merchantEmail.preheader)}</div>`,
        `<div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:${INK.textPrimary};background:${INK.bgBase};padding:24px">`,
        merchantEmail.html,
        `</div>`,
      ].join("\n");
      return client.emails.send({
        from: fromEmail,
        to: email,
        subject: merchantEmail.subject,
        html,
        text: merchantEmail.text,
        // Best-effort — app/api/lead/route.js already guards PDF generation
        // in its own try/catch, so pdfBuffer is simply absent (never blocks
        // the send) if it failed. See lib/pdf/buildReportPdf.js.
        attachments: pdfBuffer
          ? [{ filename: "stockedby-ai-visibility-report.pdf", content: pdfBuffer, contentType: "application/pdf" }]
          : undefined,
      });
    })(),
  ]);

  return {
    founderSent: results[0].status === "fulfilled" && !results[0].value?.error,
    merchantSent: results[1].status === "fulfilled" && !results[1].value?.error,
  };
}

// "Send this to my developer" (spec item 6) — a non-technical owner types a
// developer's address and we forward the ALREADY-GENERATED fix content
// (the client's own in-memory products/llmsTxt, same pattern as LeadGate.js
// sending its report data straight from memory) rather than regenerating
// anything server-side. Pure builder, no Resend/Supabase — parallel to
// buildMerchantEmail/buildFixLeadEmail above.
export function buildDeveloperFixEmail({ domain, platform, products, llmsTxt, merchantEmail }) {
  const install = getInstallInstructions(platform);
  const subject = `Product schema + llms.txt for ${domain} — from ${merchantEmail || "a StockedBy user"}`;
  const doneProducts = (products || []).filter((p) => p.status === "done");

  const textParts = [
    `Hi,`,
    ``,
    `${merchantEmail || "Someone"} used StockedBy's free Fix Generator on ${domain} (${platformLabel(platform)}) and asked us to send you the code.`,
    ``,
    `What this is: structured product data (schema.org Product JSON-LD) that AI shopping tools read to understand what's for sale — invisible to shoppers, safe to add.`,
    ``,
  ];
  const htmlParts = [
    `<p>Hi,</p>`,
    `<p>${esc(merchantEmail || "Someone")} used StockedBy's free Fix Generator on <b>${esc(domain)}</b> (${esc(platformLabel(platform))}) and asked us to send you the code.</p>`,
    `<p>What this is: structured product data (schema.org Product JSON-LD) that AI shopping tools read to understand what's for sale — invisible to shoppers, safe to add.</p>`,
  ];

  htmlParts.push(`<h3>Install steps — ${esc(install.label)}</h3>`, `<ol>${install.productJsonLd.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`);
  textParts.push(`Install steps — ${install.label}:`);
  install.productJsonLd.forEach((s, i) => textParts.push(`${i + 1}. ${s}`));
  textParts.push(``);

  doneProducts.forEach((p) => {
    const code = JSON.stringify(p.jsonLd, null, 2);
    textParts.push(`--- ${p.product?.name || p.url} ---`, p.url, `<script type="application/ld+json">`, code, `</script>`, ``);
    htmlParts.push(
      `<p><b>${esc(p.product?.name || p.url)}</b><br>${esc(p.url)}</p>`,
      `<pre style="background:${INK.bgInset};color:${INK.textPrimary};padding:12px;border-radius:8px;overflow-x:auto;font-size:12px">&lt;script type="application/ld+json"&gt;\n${esc(code)}\n&lt;/script&gt;</pre>`
    );
  });

  if (llmsTxt) {
    textParts.push(`--- llms.txt ---`, llmsTxt, ``);
    htmlParts.push(`<h3>llms.txt</h3>`, `<pre style="background:${INK.bgInset};color:${INK.textPrimary};padding:12px;border-radius:8px;overflow-x:auto;font-size:12px">${esc(llmsTxt)}</pre>`);
    textParts.push(`llms.txt install:`);
    install.llmsTxt.forEach((s, i) => textParts.push(`${i + 1}. ${s}`));
    htmlParts.push(`<ol>${install.llmsTxt.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`);
  }

  textParts.push(``, `— StockedBy (${SITE_URL})`);
  htmlParts.push(`<p>— StockedBy (<a href="${SITE_URL}">${SITE_URL}</a>)</p>`);

  return { subject, text: textParts.join("\n"), html: htmlParts.join("\n") };
}

export async function sendDeveloperFixEmail({ developerEmail, merchantEmail, domain, platform, products, llmsTxt }) {
  const client = resend();
  if (!client) {
    console.log("[email] RESEND_API_KEY not set — skipping developer fix send.");
    return { sent: false };
  }
  const fromEmail = process.env.FROM_EMAIL || "StockedBy <onboarding@resend.dev>";
  const built = buildDeveloperFixEmail({ domain, platform, products, llmsTxt, merchantEmail });
  try {
    const res = await client.emails.send({
      from: fromEmail,
      to: developerEmail,
      subject: built.subject,
      html: built.html,
      text: built.text,
    });
    return { sent: !res?.error };
  } catch (e) {
    console.error("[email] developer fix send failed", e?.message || e);
    return { sent: false };
  }
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
            <blockquote style="border-left:3px solid ${INK.accent};padding-left:12px">
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

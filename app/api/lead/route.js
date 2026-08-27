import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLeadEmails, sendFixLeadEmails } from "@/lib/email";
import { getReportBySlug } from "@/lib/reports";
import { buildLayerOne } from "@/lib/layerOne";
import { buildFounderReport } from "@/lib/founderReport";
import { buildReportPdf } from "@/lib/pdf/buildReportPdf";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";
import { SITE_URL } from "@/lib/site";
import { isValidEmailFormat, isDisposableEmail } from "@/lib/emailValidation";

export const runtime = "nodejs";
export const maxDuration = 20;

function badRequest(message) {
  return NextResponse.json({ error: message }, { status: 400 });
}

// Email gate submission (hard rule 8, un-deferred in Phase 4). Deliberately
// resilient past this point: once the request itself is valid, a Supabase
// or Resend failure must never leave a merchant staring at a report they
// can't unlock — "if Resend fails, still unlock and still save the lead"
// generalizes here to "if EITHER side fails, still unlock." Only a bad
// request (missing field, no consent, no email) or the rate limit blocks.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  const {
    email,
    brand,
    brandWebsite,
    testedDomain,
    painpoint,
    market,
    category,
    consent,
    verdict,
    reportSlug,
    source,
    platform,
    report,
    engines,
    sentiment,
    trustedSources,
    competitor,
    mentionCount,
    isFreeProvider,
    marketingOptIn,
  } = body || {};

  // "fix" leads (Fix Generator, /fix) reuse this same gate/endpoint per the
  // feature spec ("same email gate as reports, saves lead with
  // source='fix'") but have no market/category/verdict — they have a
  // domain instead. Everything else (rate limit, consent, Supabase
  // resilience) is identical between the two sources.
  const sourceInput = source === "fix" ? "fix" : "report";

  const emailInput = typeof email === "string" ? email.trim() : "";
  if (!emailInput || !isValidEmailFormat(emailInput)) {
    return badRequest("A valid work email is required.");
  }
  // Client already blocks this on blur (items 9/10) — this is the
  // server-side backstop, since the client check can be bypassed.
  if (isDisposableEmail(emailInput)) {
    return badRequest("Please use an email you check.");
  }
  const brandWebsiteInput = typeof brandWebsite === "string" ? brandWebsite.trim() : "";
  let brandInput = typeof brand === "string" ? brand.trim() : "";
  const marketInput = typeof market === "string" ? market.trim() : "";
  const categoryInput = typeof category === "string" ? category.trim() : "";

  if (sourceInput === "fix") {
    if (!brandWebsiteInput) return badRequest('"brandWebsite" (the domain) is required.');
    if (!brandInput) brandInput = brandWebsiteInput;
  } else {
    if (!brandInput) return badRequest('"brand" is required.');
    if (!marketInput) return badRequest('"market" is required.');
    if (!categoryInput) return badRequest('"category" is required.');
  }
  if (consent !== true) {
    return badRequest("Consent is required to unlock the full report.");
  }

  const ip = getClientIp(request);
  const rateLimit = checkAndConsume(ip, { namespace: "lead" });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many submissions from your network today. Try again tomorrow." },
      { status: 429 }
    );
  }

  const painpointInput = typeof painpoint === "string" ? painpoint.trim() : "";
  const consentAt = new Date().toISOString();

  const db = supabase();
  if (db) {
    try {
      const { error } = await db.from("leads").insert({
        email: emailInput,
        brand: brandInput,
        brand_domain: brandWebsiteInput || null,
        painpoint: painpointInput || null,
        market: marketInput || null,
        category: categoryInput || null,
        consent_at: consentAt,
        source: sourceInput,
        is_free_provider: typeof isFreeProvider === "boolean" ? isFreeProvider : null,
        marketing_opt_in: marketingOptIn === true,
      });
      if (error) console.error("[leads] insert failed", error.message);
    } catch (e) {
      console.error("[leads] insert failed", e?.message || e);
    }
  } else {
    console.log("[leads] SUPABASE not configured — lead not persisted:", emailInput, brandInput, marketInput, categoryInput);
  }

  // Merchant email = Layer-1 content only + link (report simplification
  // spec) — reuses the exact same lib/layerOne.js functions StoryView.js
  // renders from. Preferred path: the client (LeadGate.js) already sent
  // this report's real data (report/engines/sentiment/trustedSources)
  // straight from memory, so layer1 can always be computed here without
  // depending on Supabase having actually saved (and re-served) the report
  // — a Supabase outage, a not-yet-applied migration, or read-after-write
  // lag used to silently produce an empty, substance-free email (the
  // `!layer1` fallback in lib/email.js's buildMerchantEmail) even though
  // the merchant's real data was sitting right there in the browser the
  // whole time. Falls back to the old getReportBySlug lookup only when the
  // client didn't send this data (e.g. a stale cached page).
  const slugInput = typeof reportSlug === "string" ? reportSlug : null;
  const testedDomainInput = typeof testedDomain === "string" ? testedDomain.trim() : "";
  let layer1 = null;
  let founder = null;
  let pdfBuffer = null;
  let effectiveBrandWebsite = testedDomainInput || brandWebsiteInput;

  if (sourceInput === "report") {
    let reportData =
      report && engines
        ? {
            brand: brandInput,
            report,
            engines,
            sentiment,
            trustedSources,
            brandWebsite: effectiveBrandWebsite,
            competitor: typeof competitor === "string" ? competitor : null,
            mentionCount: typeof mentionCount === "number" ? mentionCount : undefined,
          }
        : null;

    if (!reportData && slugInput) {
      try {
        const row = await getReportBySlug(slugInput);
        const saved = row?.report_json;
        if (saved) {
          reportData = saved;
          effectiveBrandWebsite = saved.brandWebsite || effectiveBrandWebsite;
        }
      } catch (e) {
        console.error("[leads] loading report for email failed", e?.message || e);
      }
    }

    if (reportData) {
      // Malformed data (e.g. a stale client sending a slightly different
      // shape) must never 500 the whole request — that would leave the
      // merchant NOT unlocked, a worse failure than a substance-free email.
      // lib/email.js's buildMerchantEmail already has an honest, graceful
      // fallback for layer1 === null.
      try {
        layer1 = buildLayerOne({
          brand: reportData.brand,
          report: reportData.report,
          engines: reportData.engines,
          sentiment: reportData.sentiment,
          trustedSources: reportData.trustedSources,
          brandWebsite: reportData.brandWebsite,
        });
      } catch (e) {
        console.error("[leads] building layer1 failed", e?.message || e);
        layer1 = null;
      }

      // Same graceful degradation as layer1 above — lib/email.js's
      // buildMerchantEmail falls back to a short, honest email when
      // either is null, never a 500.
      try {
        founder = buildFounderReport({
          report: reportData.report,
          engines: reportData.engines,
          brand: reportData.brand,
        });
      } catch (e) {
        console.error("[leads] building founder report failed", e?.message || e);
        founder = null;
      }

      // Never blocks the send (spec item 3) — a generation failure just
      // means the email goes out without an attachment.
      try {
        pdfBuffer = await buildReportPdf({
          brand: reportData.brand,
          categoryName: categoryInput,
          market: marketInput,
          competitor: reportData.competitor,
          brandWebsite: reportData.brandWebsite,
          report: reportData.report,
          engines: reportData.engines,
          sentiment: reportData.sentiment,
          mentionCount: reportData.mentionCount,
          trustedSources: reportData.trustedSources,
          reportUrl: slugInput ? `${SITE_URL}/report/${slugInput}` : null,
        });
      } catch (e) {
        console.error("[leads] PDF generation failed — sending email without it", e?.message || e);
        pdfBuffer = null;
      }
    }
  }

  let emailResult = { founderSent: false, merchantSent: false };
  try {
    emailResult =
      sourceInput === "fix"
        ? await sendFixLeadEmails({
            email: emailInput,
            domain: brandWebsiteInput,
            platform: typeof platform === "string" ? platform : "",
            painpoint: painpointInput,
          })
        : await sendLeadEmails({
            email: emailInput,
            brand: brandInput,
            market: marketInput,
            category: categoryInput,
            painpoint: painpointInput,
            verdict: typeof verdict === "string" ? verdict : "",
            reportSlug: slugInput,
            layer1,
            founder,
            brandWebsite: effectiveBrandWebsite,
            pdfBuffer,
          });
  } catch (e) {
    console.error("[leads] email send failed", e?.message || e);
  }

  return NextResponse.json({ ok: true, ...emailResult });
}

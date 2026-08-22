import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { sendLeadEmails } from "@/lib/email";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const { email, brand, brandWebsite, painpoint, market, category, consent, verdict, reportSlug } = body || {};

  const emailInput = typeof email === "string" ? email.trim() : "";
  if (!emailInput || !EMAIL_RE.test(emailInput)) {
    return badRequest("A valid work email is required.");
  }
  const brandInput = typeof brand === "string" ? brand.trim() : "";
  if (!brandInput) return badRequest('"brand" is required.');
  const marketInput = typeof market === "string" ? market.trim() : "";
  if (!marketInput) return badRequest('"market" is required.');
  const categoryInput = typeof category === "string" ? category.trim() : "";
  if (!categoryInput) return badRequest('"category" is required.');
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

  const brandWebsiteInput = typeof brandWebsite === "string" ? brandWebsite.trim() : "";
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
        market: marketInput,
        category: categoryInput,
        consent_at: consentAt,
      });
      if (error) console.error("[leads] insert failed", error.message);
    } catch (e) {
      console.error("[leads] insert failed", e?.message || e);
    }
  } else {
    console.log("[leads] SUPABASE not configured — lead not persisted:", emailInput, brandInput, marketInput, categoryInput);
  }

  let emailResult = { founderSent: false, merchantSent: false };
  try {
    emailResult = await sendLeadEmails({
      email: emailInput,
      brand: brandInput,
      market: marketInput,
      category: categoryInput,
      painpoint: painpointInput,
      verdict: typeof verdict === "string" ? verdict : "",
      reportSlug: typeof reportSlug === "string" ? reportSlug : null,
    });
  } catch (e) {
    console.error("[leads] email send failed", e?.message || e);
  }

  return NextResponse.json({ ok: true, ...emailResult });
}

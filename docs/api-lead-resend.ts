// /app/api/lead/route.ts — Next.js App Router endpoint for ShelfShare merchant capture
// Receives the lead payload from the frontend gate and sends two emails via Resend.
//
// Setup:
//   npm install resend
//   Set RESEND_API_KEY in your environment (Vercel dashboard / .env.local).
//   NEVER put the Resend key in frontend code — this file runs server-side only.
//   Verify your sending domain in Resend (e.g. shelfshare.app) before launch;
//   until then you can send from onboarding@resend.dev to your own inbox only.

import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

const FOUNDER_EMAIL = "you@yourdomain.com"; // <- where merchant leads arrive
const FROM = "ShelfShare <hello@shelfshare.app>"; // <- your verified domain

export async function POST(req: Request) {
  try {
    const lead = await req.json();

    // basic validation — email is mandatory
    if (!lead?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const safe = (s: unknown) =>
      String(s ?? "").replace(/[<>]/g, "").slice(0, 2000);

    // 1) Notification to you — every merchant who tests, with their pain point
    await resend.emails.send({
      from: FROM,
      to: FOUNDER_EMAIL,
      subject: `🛒 New ShelfShare test: ${safe(lead.brand)} (${safe(lead.market)}) — ${safe(lead.verdict)}`,
      html: `
        <h2>New merchant tested ShelfShare</h2>
        <table cellpadding="6" style="font-family:monospace">
          <tr><td><b>Email</b></td><td>${safe(lead.email)}</td></tr>
          <tr><td><b>Brand</b></td><td>${safe(lead.brand)}</td></tr>
          <tr><td><b>Category</b></td><td>${safe(lead.category)}</td></tr>
          <tr><td><b>Market</b></td><td>${safe(lead.market)}</td></tr>
          <tr><td><b>Competitor tracked</b></td><td>${safe(lead.competitor) || "—"}</td></tr>
          <tr><td><b>Verdict</b></td><td>${safe(lead.verdict)} (score ${safe(lead.shelf_score)})</td></tr>
          <tr><td><b>Tested on</b></td><td>${safe(lead.tested_on)}</td></tr>
        </table>
        <h3>Pain point (their words)</h3>
        <blockquote style="border-left:3px solid #FFC53D;padding-left:12px">
          ${safe(lead.painpoint) || "(left blank)"}
        </blockquote>`,
    });

    // 2) Confirmation to the merchant — keeps the relationship warm
    await resend.emails.send({
      from: FROM,
      to: lead.email,
      subject: `Your AI shelf report for ${safe(lead.brand)} — ${safe(lead.verdict)}`,
      html: `
        <p>Hi,</p>
        <p>Your ShelfShare test for <b>${safe(lead.brand)}</b> is done:
        verdict <b>${safe(lead.verdict)}</b>, shelf score <b>${safe(lead.shelf_score)}</b>
        in ${safe(lead.market)}.</p>
        <p>AI shopping answers shift every few weeks — we recommend re-testing monthly.
        We'll email you when your category's next snapshot is ready.</p>
        <p>You told us your biggest pain point — we read every one of these
        personally and it shapes what we build next.</p>
        <p>— ShelfShare</p>`,
    });

    // 3) RECOMMENDED: also persist to a database so leads survive email issues.
    // Example with Supabase (npm install @supabase/supabase-js):
    //
    // import { createClient } from "@supabase/supabase-js";
    // const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    // await db.from("merchant_leads").insert({
    //   email: lead.email, brand: lead.brand, category: lead.category,
    //   market: lead.market, competitor: lead.competitor, verdict: lead.verdict,
    //   shelf_score: lead.shelf_score, painpoint: lead.painpoint,
    //   tested_on: lead.tested_on,
    // });
    //
    // The pain-point column becomes your product-research goldmine: run a monthly
    // clustering pass over it to decide the roadmap (fix-generator vs monitoring
    // vs new markets) based on what merchants actually say hurts.

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("lead route error", err);
    return NextResponse.json({ error: "Failed to process lead" }, { status: 500 });
  }
}

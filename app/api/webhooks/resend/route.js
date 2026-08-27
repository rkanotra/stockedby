import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabase } from "@/lib/supabaseClient";

export const runtime = "nodejs";
export const maxDuration = 10;

// Resend bounce/complaint webhook (spec item 13) — our real email
// verification layer, since we deliberately don't do OTP/verification
// codes (that step costs more leads than it saves at current volume). A
// bounce proves a bad address without adding friction for the other 99%
// of merchants. Updates leads.email_status; scripts/founder_digest.py
// surfaces the weekly bounce count.
//
// Signature verification follows the Svix scheme Resend webhooks use
// (https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests),
// implemented directly with Node's crypto instead of adding the svix
// package as a dependency for one HMAC check.
function verifySignature(rawBody, headers, secret) {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatureHeader = headers.get("svix-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const secretBytes = Buffer.from(secret.startsWith("whsec_") ? secret.slice(6) : secret, "base64");
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  return signatureHeader
    .split(" ")
    .some((part) => {
      const [, sig] = part.split(",");
      if (!sig) return false;
      const a = Buffer.from(sig);
      const b = Buffer.from(expected);
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
}

const STATUS_BY_EVENT = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

export async function POST(request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const rawBody = await request.text();

  if (!secret) {
    console.log("[webhooks/resend] RESEND_WEBHOOK_SECRET not set — ignoring webhook.");
    return NextResponse.json({ ok: true, skipped: true });
  }
  if (!verifySignature(rawBody, request.headers, secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const status = STATUS_BY_EVENT[payload?.type];
  const recipients = payload?.data?.to;
  const recipient = Array.isArray(recipients) ? recipients[0] : recipients;
  if (!status || !recipient) {
    // Every other Resend event type (sent, opened, clicked, delayed) is
    // outside this webhook's scope — ack it so Resend doesn't retry.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const db = supabase();
  if (!db) {
    console.log("[webhooks/resend] Supabase not configured — status not persisted:", recipient, status);
    return NextResponse.json({ ok: true, persisted: false });
  }

  try {
    // Updates every lead row with this email (not just the most recent) —
    // a bounce means the address itself is bad, which is true regardless
    // of which submission it came from.
    const { error } = await db
      .from("leads")
      .update({ email_status: status, email_status_updated_at: new Date().toISOString() })
      .eq("email", recipient);
    if (error) console.error("[webhooks/resend] update failed", error.message);
  } catch (e) {
    console.error("[webhooks/resend] update failed", e?.message || e);
  }

  return NextResponse.json({ ok: true });
}

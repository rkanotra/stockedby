import { safeReturnPath } from "@/lib/auth/returnPath";
import { NextResponse } from "next/server";
import { isValidEmailFormat, isDisposableEmail } from "@/lib/emailValidation";
import { createMagicLinkToken } from "@/lib/auth/session";
import { sendMagicLinkEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Step 1 of merchant login (Phase 2): POST { email } -> emails a one-time
// sign-in link. Always responds { ok: true } regardless of whether the
// email is real/known — never reveals whether an address has an account
// (a distinct concern from hard rule 13's disposable-domain check below,
// which is about email QUALITY, not account enumeration).
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !isValidEmailFormat(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (isDisposableEmail(email)) {
    return NextResponse.json({ error: "Please use an email you check." }, { status: 400 });
  }

  const ip = getClientIp(request);
  // Own namespace/limit — this is a login endpoint, not the free test, so
  // it gets its own modest cap rather than sharing app/api/test's counter
  // (hard rule 9's pattern: separate namespace per endpoint).
  const rateLimit = checkAndConsume(ip, { namespace: "auth-request-link", limit: 10 });
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }

  const token = await createMagicLinkToken(email);
  if (!token) {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }

  const link = `${SITE_URL}/api/auth/verify?token=${encodeURIComponent(token)}&next=${encodeURIComponent(safeReturnPath(body?.next))}`;
  const result = await sendMagicLinkEmail({ email, link });
  if (!result.sent) {
    return NextResponse.json({ error: "Couldn't send the sign-in email. Please try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

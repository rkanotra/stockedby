import { safeReturnPath } from "@/lib/auth/returnPath";
import { NextResponse } from "next/server";
import { redeemMagicLinkToken, createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

export const runtime = "nodejs";

// Step 2 of merchant login: GET /api/auth/verify?token=... (the link
// emailed by /api/auth/request-link). Redeems the single-use token,
// creates a session, sets the httpOnly cookie, and redirects into the
// dashboard — this MUST be a Route Handler, not a Server Component, since
// only a Route Handler (or a Server Function) can set a cookie (see
// lib/auth/requireMerchant.js's own comment).
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token") || "";

  const redeemed = await redeemMagicLinkToken(token);
  if (!redeemed) {
    return NextResponse.redirect(new URL("/login?error=expired", origin));
  }

  const sessionToken = await createSession(redeemed.merchantId);
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login?error=unavailable", origin));
  }

  const response = NextResponse.redirect(new URL(safeReturnPath(searchParams.get("next")), origin));
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}

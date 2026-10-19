import { teamClient, teamConfigured, json, failure, readBody } from "@/lib/team/server";
import { checkAndConsume, getClientIp } from "@/lib/rateLimit";
import { cookies } from "next/headers";
import { TEAM_RETURN_COOKIE, TEAM_RETURN_COOKIE_OPTIONS } from "@/lib/auth/teamReturn";
import { isAscentOwnerEmail } from "@/lib/ascent/access";
export async function GET() {
  if (!teamConfigured()) return json({ configured: false, user: null });
  try {
    const db = await teamClient();
    const { data } = await db.auth.getUser();
    return json({ configured: true, user: data.user ? { id: data.user.id, email: data.user.email } : null });
  } catch { return json({ configured: true, user: null, error: "Sign-in service is unavailable. Please try again." }, 503); }
}
export async function POST(request) {
  try {
    const body = await readBody(request, 5000), db = await teamClient();
    if (body.action === "signout") { const { error } = await db.auth.signOut(); if (error) throw error; (await cookies()).delete(TEAM_RETURN_COOKIE); return json({ ok: true }); }
    if (!checkAndConsume(getClientIp(request), { namespace: "team-login", limit: 10 }).allowed) return json({ error: "Too many sign-in requests. Please try again later." }, 429);
    if (body.action !== "signin" || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254) throw Error("Enter a valid work email.");
    const ascentReturn = body.returnTo === "/ascent" || body.returnTo === "/ascent#view=account";
    if (ascentReturn && !isAscentOwnerEmail(body.email))
      return json({ error: "Ascent is private. Sign-in is available only to its authorised owner." }, 403);
    const origin = new URL(request.headers.get("origin")).origin;
    const { error } = await db.auth.signInWithOtp({ email: body.email.trim().toLowerCase(), options: { emailRedirectTo: `${origin}/api/team/auth/callback`, ...(ascentReturn ? { shouldCreateUser: false } : {}) } });
    if (error) throw Error("Could not send the sign-in link. Please try again shortly; your workspace owner may need to configure email delivery.");
    const jar = await cookies();
    // Keep the existing Supabase callback URL. Only the latest successful
    // sign-in request controls the destination in this browser's PKCE flow.
    if (ascentReturn) jar.set(TEAM_RETURN_COOKIE, body.returnTo, TEAM_RETURN_COOKIE_OPTIONS);
    else jar.delete(TEAM_RETURN_COOKIE);
    return json({ ok: true });
  } catch (error) { return failure(error); }
}

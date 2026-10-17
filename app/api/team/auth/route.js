import { teamClient, teamConfigured, json, failure, readBody } from "@/lib/team/server";
import { checkAndConsume, getClientIp } from "@/lib/rateLimit";
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
    if (body.action === "signout") { const { error } = await db.auth.signOut(); if (error) throw error; return json({ ok: true }); }
    if (!checkAndConsume(getClientIp(request), { namespace: "team-login", limit: 10 }).allowed) return json({ error: "Too many sign-in requests. Please try again later." }, 429);
    if (body.action !== "signin" || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 254) throw Error("Enter a valid work email.");
    const origin = new URL(request.headers.get("origin")).origin;
    const { error } = await db.auth.signInWithOtp({ email: body.email.trim().toLowerCase(), options: { emailRedirectTo: `${origin}/api/team/auth/callback` } });
    if (error) throw Error("Could not send the sign-in link. Please try again shortly; your workspace owner may need to configure email delivery.");
    return json({ ok: true });
  } catch (error) { return failure(error); }
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { sameOriginRequest } from "../auth/requestOrigin.js";
export const teamConfigured = () => !!(process.env.STUDIO_SUPABASE_URL && process.env.STUDIO_SUPABASE_PUBLISHABLE_KEY);
export async function teamClient() {
  if (!teamConfigured()) throw Object.assign(Error("Team workspaces are awaiting database setup. The local studio remains available."), { status: 503 });
  const jar = await cookies();
  return createServerClient(process.env.STUDIO_SUPABASE_URL, process.env.STUDIO_SUPABASE_PUBLISHABLE_KEY, {
    cookieOptions: { name: "stockedby-team", httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" },
    cookies: { getAll: () => jar.getAll(), setAll: values => values.forEach(({ name, value, options }) => jar.set(name, value, options)) },
  });
}
export async function requireTeamUser() {
  const db = await teamClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw Object.assign(Error("Sign in to your team workspace."), { status: 401 });
  return { db, user: data.user };
}
export function json(data, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "private, no-store", "Vary": "Cookie" } }); }
export function failure(error) {
  const message = error?.message || "Could not complete this action.";
  const status = error.status || (/conflict|changed since|fresh review/i.test(message) ? 409 : /permission|member|author cannot|owner|reviewer/i.test(message) ? 403 : 400);
  return json({ error: message }, status);
}
export async function readBody(request, max = 900000) {
  if (!sameOriginRequest(request)) throw Object.assign(Error("Open StockedBy to make changes."), { status: 403 });
  if (Number(request.headers.get("content-length")) > max) throw Error("This request is too large.");
  const text = await request.text();
  if (text.length > max) throw Error("This request is too large.");
  return JSON.parse(text);
}
export async function command(db, action, args) {
  const { data, error } = await db.rpc("team_command", { action, args });
  if (error) throw Error(error.message);
  return data;
}

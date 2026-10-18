import { teamClient } from "@/lib/team/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TEAM_RETURN_COOKIE, teamReturnPath } from "@/lib/auth/teamReturn";
export async function GET(request) {
  const url = new URL(request.url), code = url.searchParams.get("code");
  const jar = await cookies();
  const destination = jar.get(TEAM_RETURN_COOKIE)?.value;
  jar.delete(TEAM_RETURN_COOKIE);
  if (code) {
    try { const db = await teamClient(); const { error } = await db.auth.exchangeCodeForSession(code); if (!error) return NextResponse.redirect(new URL(teamReturnPath(destination), url.origin)); } catch {}
  }
  return NextResponse.redirect(new URL(teamReturnPath(destination, true), url.origin));
}

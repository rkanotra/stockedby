import { teamClient } from "@/lib/team/server";
import { NextResponse } from "next/server";
export async function GET(request) {
  const url = new URL(request.url), code = url.searchParams.get("code");
  if (code) {
    try { const db = await teamClient(); const { error } = await db.auth.exchangeCodeForSession(code); if (!error) return NextResponse.redirect(new URL("/workspace", url.origin)); } catch {}
  }
  return NextResponse.redirect(new URL("/workspace?authError=1", url.origin));
}

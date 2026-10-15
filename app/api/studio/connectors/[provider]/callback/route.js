import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  PROVIDERS,
  cookieName,
  cookieOptions,
  callbackUrl,
  seal,
  unseal,
  exchange,
} from "@/lib/studio/oauth";
export const runtime = "nodejs";
export async function GET(request, { params }) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider))
    return new Response("Not found", { status: 404 });
  const jar = await cookies(),
    url = new URL(request.url),
    saved = unseal(jar.get(cookieName(provider, true))?.value);
  jar.set(cookieName(provider, true), "", { ...cookieOptions(), maxAge: 0 });
  const destination = new URL("/studio", callbackUrl(provider));
  try {
    if (
      !saved ||
      saved.provider !== provider ||
      saved.state !== url.searchParams.get("state") ||
      !url.searchParams.get("code")
    )
      throw Error("Invalid authorization");
    const session = await exchange(
      provider,
      url.searchParams.get("code"),
      saved,
    );
    jar.set(
      cookieName(provider),
      seal(session),
      cookieOptions(Math.floor((session.exp - Date.now()) / 1000)),
    );
    destination.searchParams.set("connected", provider);
  } catch {
    destination.searchParams.set(
      "connectorError",
      "Authorization failed or expired. Please reconnect.",
    );
  }
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

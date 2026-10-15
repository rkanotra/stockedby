import { cookies } from "next/headers";
import { sameOriginRequest } from "@/lib/auth/requestOrigin";
import {
  PROVIDERS,
  isConfigured,
  cookieName,
  cookieOptions,
  seal,
  unseal,
  startOAuth,
} from "@/lib/studio/oauth";
export const runtime = "nodejs";
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request, { params }) {
  const { provider } = await params;
  if (!PROVIDERS.includes(provider))
    return json({ error: "Unknown connector." }, 404);
  const jar = await cookies(),
    session = unseal(jar.get(cookieName(provider))?.value);
  return json({
    configured: isConfigured(provider),
    connected: !!session,
    expiresAt: session?.exp || null,
  });
}
export async function POST(request, { params }) {
  if (!sameOriginRequest(request))
    return json({ error: "Connect from the StockedBy workspace." }, 403);
  const { provider } = await params;
  if (!PROVIDERS.includes(provider))
    return json({ error: "Unknown connector." }, 404);
  if (!isConfigured(provider))
    return json(
      {
        error:
          "The site owner must register and configure this OAuth app first. Open Connection setup for the exact steps.",
      },
      503,
    );
  const flow = startOAuth(provider);
  (await cookies()).set(
    cookieName(provider, true),
    seal(flow.state),
    cookieOptions(600),
  );
  return json({ url: flow.url });
}
export async function DELETE(request, { params }) {
  if (!sameOriginRequest(request))
    return json({ error: "Disconnect from the workspace." }, 403);
  const { provider } = await params;
  if (!PROVIDERS.includes(provider))
    return json({ error: "Unknown connector." }, 404);
  const jar = await cookies();
  jar.set(cookieName(provider), "", { ...cookieOptions(), maxAge: 0 });
  jar.set(cookieName(provider, true), "", { ...cookieOptions(), maxAge: 0 });
  return json({ disconnected: true });
}

import { cookies } from "next/headers";
import { sameOriginRequest } from "@/lib/auth/requestOrigin";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";
import { PROVIDERS, cookieName, unseal } from "@/lib/studio/oauth";
import { connectorAction } from "@/lib/studio/connectorActions";
export const runtime = "nodejs";
export const maxDuration = 60;
const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function POST(request) {
  if (!sameOriginRequest(request))
    return json({ error: "Use the StockedBy workspace." }, 403);
  if (
    !checkAndConsume(getClientIp(request), {
      namespace: "studio-connectors",
      limit: 200,
    }).allowed
  )
    return json(
      { error: "Connection request limit reached. Try again tomorrow." },
      429,
    );
  let input;
  try {
    const raw = await request.text();
    if (raw.length > 80000) throw Error();
    input = JSON.parse(raw);
    if (!PROVIDERS.includes(input.provider)) throw Error();
  } catch {
    return json({ error: "Invalid connector request." }, 400);
  }
  const session = unseal(
    (await cookies()).get(cookieName(input.provider))?.value,
  );
  if (!session)
    return json(
      { error: "Connect your account first. Sessions expire after one hour." },
      401,
    );
  try {
    return json(await connectorAction(input, session));
  } catch (e) {
    return json(
      { error: e.message || "The provider could not complete this request." },
      e.status === 401 ? 401 : 400,
    );
  }
}

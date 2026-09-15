import { randomUUID } from "node:crypto";
import { cleanCatalog } from "@/lib/agentStore/catalog";
import {
  signedIn,
  database,
  getAgentStore,
  apiError,
  jsonBody,
} from "@/lib/agentStore/server";
export async function PUT(request) {
  try {
    const merchant = await signedIn(request);
    const body = await jsonBody(request);
    let draft;
    try {
      draft = cleanCatalog(body);
    } catch (e) {
      throw Object.assign(e, { status: 400 });
    }
    const existing = await getAgentStore(merchant.merchantId);
    const sameDomain = existing?.draft?.domain === draft.domain;
    const values = {
      merchant_id: merchant.merchantId,
      draft,
      updated_at: new Date().toISOString(),
      ...(sameDomain
        ? {}
        : { verified_domain: null, verification_token: randomUUID() }),
    };
    const { data, error } = await database()
      .from("agent_storefronts")
      .upsert(values, { onConflict: "merchant_id" })
      .select(
        "id,draft,verification_token,verified_domain,published_at,updated_at",
      )
      .single();
    if (error) throw error;
    return Response.json({ store: data });
  } catch (e) {
    return apiError(e);
  }
}

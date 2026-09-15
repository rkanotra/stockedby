import {
  signedIn,
  database,
  getAgentStore,
  getAccess,
  apiError,
} from "@/lib/agentStore/server";
import { inspectCatalog } from "@/lib/agentStore/catalog";
export async function POST(request) {
  try {
    const merchant = await signedIn(request);
    const store = await getAgentStore(merchant.merchantId);
    if (!store)
      throw Object.assign(new Error("Save your catalog first."), {
        status: 400,
      });
    if (!(await getAccess(merchant.merchantId)).active)
      throw Object.assign(new Error("Activate your 30-day pass to publish."), {
        status: 402,
      });
    if (store.verified_domain !== store.draft.domain)
      throw Object.assign(new Error("Verify your store ownership first."), {
        status: 403,
      });
    const checks = inspectCatalog(store.draft);
    if (!checks.ready)
      return Response.json({ error: checks.issues[0] }, { status: 422 });
    const { error } = await database().rpc("publish_agent_store", {
      store_id: store.id,
      owner_id: merchant.merchantId,
      expected_updated_at: store.updated_at,
    });
    if (error) throw error;
    return Response.json({ url: `/stores/${store.id}` });
  } catch (e) {
    return apiError(e);
  }
}

import {
  signedIn,
  database,
  getAgentStore,
  apiError,
} from "@/lib/agentStore/server";
import { publicHttpsUrl } from "@/lib/agentStore/catalog";
import { hasOwnershipMeta } from "@/lib/agentStore/verification";
import { assertPublicHostname } from "@/lib/audit/ssrfGuard";
import { fetchTextSafe } from "@/lib/audit/fetchWithTimeout";
import { checkAndConsume } from "@/lib/rateLimit";
export const maxDuration = 45;
export async function POST(request) {
  try {
    const merchant = await signedIn(request);
    if (
      !checkAndConsume(merchant.merchantId, {
        namespace: "agent-store-verify",
        limit: 20,
      }).allowed
    )
      throw Object.assign(new Error("Try verification again tomorrow."), {
        status: 429,
      });
    const store = await getAgentStore(merchant.merchantId);
    const url = publicHttpsUrl(store?.draft?.domain);
    if (!url)
      throw Object.assign(new Error("Save a valid store address first."), {
        status: 400,
      });
    await assertPublicHostname(url.hostname);
    const result = await fetchTextSafe(url.origin, {
      timeoutMs: 6000,
      maxBytes: 500000,
    });
    if (!result.ok || !hasOwnershipMeta(result.text, store.verification_token))
      throw Object.assign(
        new Error(
          "Verification tag was not found in your homepage HTML. Add it to the head section, publish your theme, then retry.",
        ),
        { status: 422 },
      );
    const { data, error } = await database()
      .from("agent_storefronts")
      .update({ verified_domain: store.draft.domain })
      .eq("id", store.id)
      .eq("updated_at", store.updated_at)
      .select("id")
      .maybeSingle();
    if (error || !data)
      throw Object.assign(
        new Error("Your draft changed. Save and verify again."),
        { status: 409 },
      );
    return Response.json({ verified: true });
  } catch (e) {
    return apiError(e);
  }
}

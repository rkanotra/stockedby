import {
  signedIn,
  database,
  apiError,
  jsonBody,
} from "@/lib/agentStore/server";
import { isPaymentAdmin } from "@/lib/agentStore/payments";
export async function POST(request) {
  try {
    const merchant = await signedIn(request);
    if (!isPaymentAdmin(merchant, process.env.STOCKEDBY_PAYMENTS_ADMIN_EMAIL))
      throw Object.assign(new Error("Not authorized."), { status: 403 });
    const body = await jsonBody(request);
    if (
      !/^[a-f0-9-]{36}$/.test(body.id || "") ||
      !["approved", "rejected"].includes(body.decision) ||
      body.confirmed !== true ||
      typeof body.note !== "string" ||
      !body.note.trim()
    )
      throw Object.assign(
        new Error("Confirm your bank check and enter a review note."),
        { status: 400 },
      );
    const { error } = await database().rpc("review_agent_store_payment", {
      claim_id: body.id,
      reviewer: merchant.merchantId,
      decision: body.decision,
      note: body.note.trim().slice(0, 500),
    });
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}

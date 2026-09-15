import {
  signedIn,
  database,
  apiError,
  jsonBody,
} from "@/lib/agentStore/server";
import { salesConfig } from "@/lib/agentStore/config";
import { paymentReference } from "@/lib/agentStore/payments";
import { checkAndConsume } from "@/lib/rateLimit";
export async function POST(request) {
  try {
    const merchant = await signedIn(request);
    const config = salesConfig();
    if (!config.enabled)
      throw Object.assign(new Error("Payments are not open yet."), {
        status: 503,
      });
    if (
      !checkAndConsume(merchant.merchantId, {
        namespace: "upi-claim",
        limit: 5,
      }).allowed
    )
      throw Object.assign(
        new Error("Too many submissions. Contact support for help."),
        { status: 429 },
      );
    const body = await jsonBody(request);
    const reference = paymentReference(body.reference);
    if (!reference || body.accepted !== true)
      throw Object.assign(
        new Error(
          "Enter the 12-digit UPI reference and confirm the payment terms.",
        ),
        { status: 400 },
      );
    const { error } = await database()
      .from("manual_payment_claims")
      .insert({
        merchant_id: merchant.merchantId,
        reference,
        amount_inr: config.amount,
      });
    if (error?.code === "23505")
      throw Object.assign(
        new Error(
          "A payment is already awaiting review, or this reference was already submitted. Contact support if you need help.",
        ),
        { status: 409 },
      );
    if (error) throw error;
    return Response.json({ status: "pending" });
  } catch (e) {
    return apiError(e);
  }
}

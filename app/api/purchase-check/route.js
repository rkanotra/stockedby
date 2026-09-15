import { signedIn, apiError, jsonBody } from "@/lib/agentStore/server";
import { checkAndConsume } from "@/lib/rateLimit";
import { hasOwnershipMeta } from "@/lib/agentStore/verification";
import { paymentReference } from "@/lib/agentStore/payments";
import { storeOrigin, validateCase, invalid } from "@/lib/purchaseCheck/model";
import { purchaseConfig } from "@/lib/purchaseCheck/config";
import {
  db,
  rpc,
  unwrap,
  ownStore,
  assertId,
  assertOperator,
  workspace,
} from "@/lib/purchaseCheck/server";
import { storeText } from "@/lib/purchaseCheck/network";
export const maxDuration = 45;
export async function GET(request) {
  try {
    const merchant = await signedIn(request);
    return Response.json(await workspace(merchant.merchantId), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request) {
  try {
    const merchant = await signedIn(request);
    if (
      !checkAndConsume(merchant.merchantId, {
        namespace: "purchase-check",
        limit: 150,
      }).allowed
    )
      throw Object.assign(
        new Error("Too many changes today. Please try again tomorrow."),
        { status: 429 },
      );
    const body = await jsonBody(request);
    const mid = merchant.merchantId;
    if (body.action === "store.create") {
      const origin = storeOrigin(body.origin);
      const name =
        typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
      if (!name) throw invalid("Enter your store name.");
      const id = await rpc("pc_save_store", {
        p_merchant: mid,
        p_name: name,
        p_origin: origin,
      });
      return Response.json({ id });
    }
    if (body.action === "store.verify") {
      const store = await ownStore(mid, body.id);
      let html;
      try {
        html = await storeText(store.origin, store.origin);
      } catch {
        throw invalid(
          "The homepage could not be read. Use the final public domain shown in your browser.",
        );
      }
      if (!hasOwnershipMeta(html, store.verification_token))
        throw invalid(
          "Verification tag not found. Add it to the head of your published theme and try again.",
        );
      unwrap(
        await db()
          .from("pc_stores")
          .update({ verified_at: new Date().toISOString() })
          .eq("id", store.id)
          .eq("merchant_id", mid),
      );
      return Response.json({ verified: true });
    }
    if (body.action === "product.read") {
      const store = await ownStore(mid, body.storeId);
      if (!store.verified_at)
        throw invalid("Verify your store before loading products.");
      let url;
      try {
        url = new URL(body.url);
      } catch {
        throw invalid("Paste the full product link.");
      }
      if (
        url.origin !== store.origin ||
        !/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?products\/[a-z0-9_-]+\/?$/i.test(
          url.pathname,
        )
      )
        throw invalid("Use a product link on this store.");
      let product;
      try {
        product = JSON.parse(
          await storeText(
            `${url.origin}${url.pathname.replace(/\/$/, "")}.js`,
            store.origin,
          ),
        );
      } catch {
        throw invalid(
          "Product data could not be loaded. Standard Shopify product URLs are supported.",
        );
      }
      if (!Array.isArray(product.variants))
        throw invalid("This storefront did not return Shopify variant data.");
      return Response.json({
        title: String(product.title || "").slice(0, 200),
        variants: product.variants
          .slice(0, 200)
          .map((v) => ({
            id: String(v.id),
            title: String(v.title || "").slice(0, 200),
            price: v.price,
            available: v.available,
          })),
      });
    }
    if (body.action === "case.save") {
      const store = await ownStore(mid, body.storeId);
      const config = validateCase(body.config, store.origin);
      const id = await rpc("pc_save_case", {
        p_merchant: mid,
        p_store: store.id,
        p_config: config,
        p_id: body.id ? assertId(body.id) : null,
      });
      return Response.json({ id });
    }
    if (body.action === "run") {
      const id = await rpc("pc_enqueue", {
        p_merchant: mid,
        p_case: assertId(body.caseId),
        p_parent: body.parentId ? assertId(body.parentId) : null,
        p_source: body.parentId ? "retest" : "manual",
      });
      return Response.json({ id });
    }
    if (body.action === "cancel") {
      await rpc("pc_cancel", { p_merchant: mid, p_run: assertId(body.id) });
      return Response.json({ ok: true });
    }
    if (body.action === "case.schedule") {
      if (typeof body.weekly !== "boolean")
        throw invalid("Choose whether weekly checks are enabled.");
      const c = unwrap(
        await db()
          .from("pc_cases")
          .select("id,store_id")
          .eq("id", assertId(body.id))
          .eq("merchant_id", mid)
          .maybeSingle(),
      );
      if (!c) throw invalid("Journey not found.");
      const account = unwrap(
        await db()
          .from("pc_accounts")
          .select("credits")
          .eq("merchant_id", mid)
          .maybeSingle(),
      );
      if (body.weekly && !account?.credits)
        throw invalid("Add credits before enabling weekly checks.");
      unwrap(
        await db()
          .from("pc_cases")
          .update({
            weekly: body.weekly,
            next_run_at: body.weekly
              ? new Date(Date.now() + 7 * 86400000).toISOString()
              : null,
            schedule_note: null,
          })
          .eq("id", c.id)
          .eq("merchant_id", mid),
      );
      return Response.json({ ok: true });
    }
    if (body.action === "payment.submit") {
      const config = purchaseConfig();
      if (!config.enabled)
        throw Object.assign(
          new Error(
            "Payments are not open yet. You can still prepare your journeys.",
          ),
          { status: 503 },
        );
      const reference = paymentReference(body.reference);
      if (!reference || body.accepted !== true)
        throw invalid(
          "Enter the 12-digit UPI reference and accept the check-pack terms.",
        );
      const result = await db()
        .from("manual_payment_claims")
        .insert({
          merchant_id: mid,
          reference,
          amount_inr: config.amount,
          product: "purchase_check",
        });
      if (result.error?.code === "23505")
        throw invalid(
          "A payment is already pending, or this reference has already been submitted.",
        );
      unwrap(result);
      return Response.json({ ok: true });
    }
    if (body.action?.startsWith("operator.")) {
      assertOperator(merchant);
      if (body.action === "operator.settings") {
        if (
          typeof body.paused !== "boolean" ||
          !Number.isInteger(body.dailyLimit) ||
          body.dailyLimit < 1 ||
          body.dailyLimit > 200
        )
          throw invalid("Choose a daily limit from 1 to 200.");
        unwrap(
          await db()
            .from("pc_settings")
            .update({
              paused: body.paused,
              daily_limit: body.dailyLimit,
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1),
        );
        return Response.json({ ok: true });
      }
      if (body.action === "operator.grant") {
        await rpc("pc_grant_credits", {
          p_merchant: assertId(body.merchantId),
          p_actor: mid,
          p_amount: body.amount,
          p_note: String(body.note || "").slice(0, 300),
        });
        return Response.json({ ok: true });
      }
      if (body.action === "operator.payment") {
        if (body.confirmed !== true)
          throw invalid("Confirm that you checked your bank receipt.");
        await rpc("pc_review_payment", {
          p_claim: assertId(body.id),
          p_reviewer: mid,
          p_decision: body.decision,
          p_note: String(body.note || "").slice(0, 500),
        });
        return Response.json({ ok: true });
      }
      if (body.action === "operator.review") {
        if (
          !["accepted", "dismissed"].includes(body.decision) ||
          String(body.note || "").trim().length < 3
        )
          throw invalid("Choose a review decision and add a note.");
        const row = unwrap(
          await db()
            .from("pc_runs")
            .update({
              review_status: body.decision,
              review_note: String(body.note).trim().slice(0, 1000),
              reviewed_at: new Date().toISOString(),
              reviewed_by: mid,
            })
            .eq("id", assertId(body.id))
            .in("status", ["completed", "failed"])
            .select("id")
            .maybeSingle(),
        );
        if (!row) throw invalid("A completed check is required for review.");
        return Response.json({ ok: true });
      }
    }
    throw invalid("Unknown action.");
  } catch (e) {
    return apiError(e);
  }
}

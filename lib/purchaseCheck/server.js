import { supabase } from "../supabaseClient.js";
import { isOperator } from "./model.js";
import { operatorEmail } from "./config.js";
export function db() {
  const client = supabase();
  if (!client)
    throw Object.assign(
      new Error(
        "Purchase Check is being connected. Your store has not been charged.",
      ),
      { status: 503 },
    );
  return client;
}
export function unwrap({ data, error }) {
  if (error)
    throw Object.assign(
      new Error(
        error.code === "P0001"
          ? error.message
          : "Purchase Check is temporarily unavailable. Please try again.",
      ),
      { status: error.code === "P0001" ? 409 : 503 },
    );
  return data;
}
export async function rpc(name, args = {}) {
  return unwrap(await db().rpc(name, args));
}
export function assertId(id) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      id || "",
    )
  )
    throw Object.assign(new Error("Invalid record."), { status: 400 });
  return id;
}
export async function ownStore(merchantId, id) {
  assertId(id);
  const row = unwrap(
    await db()
      .from("pc_stores")
      .select("*")
      .eq("id", id)
      .eq("merchant_id", merchantId)
      .maybeSingle(),
  );
  if (!row) throw Object.assign(new Error("Store not found."), { status: 404 });
  return row;
}
export function assertOperator(merchant) {
  if (!isOperator(merchant, operatorEmail()))
    throw Object.assign(new Error("Operator access required."), {
      status: 403,
    });
}
export async function workspace(merchantId) {
  const client = db();
  const results = await Promise.all([
    client
      .from("pc_accounts")
      .select("credits")
      .eq("merchant_id", merchantId)
      .maybeSingle(),
    client
      .from("pc_stores")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at"),
    client
      .from("pc_cases")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at"),
    client
      .from("pc_runs")
      .select(
        "id,case_id,store_id,config,status,source,result,error_code,review_status,review_note,created_at,completed_at,parent_run_id",
      )
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("manual_payment_claims")
      .select("id,amount_inr,status,created_at,review_note")
      .eq("merchant_id", merchantId)
      .eq("product", "purchase_check")
      .order("created_at", { ascending: false })
      .limit(10),
    client
      .from("pc_settings")
      .select("paused,heartbeat_at")
      .eq("id", 1)
      .single(),
  ]);
  const [account, stores, cases, runs, payments, settings] =
    results.map(unwrap);
  settings.connected = Boolean(
    settings.heartbeat_at &&
      Date.now() - new Date(settings.heartbeat_at).getTime() < 90 * 60000,
  );
  return {
    credits: account?.credits || 0,
    stores,
    cases,
    runs,
    payments,
    settings,
  };
}
export async function operations() {
  const client = db();
  const fields =
    "id,case_id,store_id,config,status,result,error_code,review_status,review_note,created_at,completed_at,merchants!pc_runs_merchant_id_fkey(email)";
  const results = await Promise.all([
    client.from("pc_settings").select("*").eq("id", 1).single(),
    client
      .from("pc_runs")
      .select(fields)
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("manual_payment_claims")
      .select(
        "id,reference,amount_inr,status,created_at,merchants!manual_payment_claims_merchant_id_fkey(email)",
        { count: "exact" },
      )
      .eq("product", "purchase_check")
      .eq("status", "pending")
      .order("created_at")
      .limit(100),
    client
      .from("pc_accounts")
      .select("merchant_id,credits,merchants(email)")
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("pc_ledger")
      .select(
        "id,delta,reason,created_at,merchants!pc_ledger_merchant_id_fkey(email)",
      )
      .order("created_at", { ascending: false })
      .limit(30),
    client
      .from("pc_runs")
      .select(fields, { count: "exact" })
      .eq("review_status", "open")
      .or("status.eq.failed,result->>verdict.in.(issue,unknown)")
      .order("created_at")
      .limit(100),
    client
      .from("pc_runs")
      .select("id", { count: "exact", head: true })
      .in("status", ["queued", "running"]),
  ]);
  const [settings, runs, payments, accounts, ledger, attention] =
    results.map(unwrap);
  settings.connected = Boolean(
    settings.heartbeat_at &&
      Date.now() - new Date(settings.heartbeat_at).getTime() < 90 * 60000,
  );
  return {
    settings,
    runs,
    payments,
    accounts,
    ledger,
    attention,
    attentionCount: results[5].count,
    paymentCount: results[2].count,
    queueCount: results[6].count,
  };
}

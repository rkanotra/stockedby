import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { runPurchase } from "../lib/purchaseCheck/runner.js";

// Run on a scheduled GitHub runner or a persistent machine. No AI-provider
// calls, inbox access, live payment submission or production theme edits.
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
  throw new Error("Set the worker Supabase URL and service key.");
const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } },
);
const maxRuns = Math.max(
  1,
  Math.min(5, Number(process.env.PURCHASE_CHECK_BATCH_SIZE) || 3),
);
async function rpc(name, args = {}) {
  const { data, error } = await db.rpc(name, args);
  if (error) throw new Error(`${name} failed (${error.code || "database"})`);
  return data;
}
await rpc("pc_schedule_due");
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PURCHASE_CHECK_CHROMIUM_PATH
    ? { executablePath: process.env.PURCHASE_CHECK_CHROMIUM_PATH }
    : {}),
});
let completed = 0;
try {
  for (let i = 0; i < maxRuns; i++) {
    const [run] = await rpc("pc_claim");
    if (!run) break;
    let result = null,
      errorCode = null;
    try {
      const { data: store, error } = await db
        .from("pc_stores")
        .select("*")
        .eq("id", run.store_id)
        .eq("merchant_id", run.merchant_id)
        .single();
      if (error || !store?.verified_at) throw new Error("ownership_lost");
      result = await runPurchase(browser, store, run.config);
    } catch (e) {
      errorCode =
        e.message === "ownership_lost"
          ? "ownership_lost"
          : "runner_unavailable";
    }
    const saved = await rpc("pc_finish", {
      p_run: run.id,
      p_lease: run.lease_token,
      p_result: result,
      p_error: errorCode,
    });
    if (!saved)
      throw new Error("Worker lease expired; result was not accepted.");
    if (errorCode === "ownership_lost")
      await db
        .from("pc_stores")
        .update({ verified_at: null })
        .eq("id", run.store_id);
    completed++;
  }
} finally {
  await browser.close();
}
console.log(
  `Purchase Check: ${completed} job(s) handled. Open Operations for results.`,
);

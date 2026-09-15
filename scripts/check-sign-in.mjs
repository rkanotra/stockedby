// Read-only deployment preflight. Load the intended environment explicitly:
// node --env-file=.env.local scripts/check-sign-in.mjs
// Never prints credentials, reads customer rows, creates tokens or sends mail.
const required = ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "RESEND_API_KEY", "FROM_EMAIL"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`FAIL: Missing ${missing.join(", ")}`);
  process.exit(1);
}

let base;
try {
  base = new URL(process.env.SUPABASE_URL);
  if (base.protocol !== "https:" || base.username || base.password) throw new Error();
} catch {
  console.error("FAIL: SUPABASE_URL must be a valid HTTPS project URL.");
  process.exit(1);
}

const tables = {
  merchants: "id,email,last_login_at",
  merchant_auth_tokens: "id,email,token_hash,expires_at,used_at",
  merchant_sessions: "id,merchant_id,token_hash,expires_at",
  pc_accounts: "merchant_id,credits",
  pc_stores: "id,merchant_id",
  pc_cases: "id,merchant_id",
  pc_runs: "id,merchant_id,review_status",
  pc_settings: "id,paused",
  manual_payment_claims: "id,merchant_id,product",
};
let failures = 0;
for (const [table, columns] of Object.entries(tables)) {
  try {
    const url = new URL(`/rest/v1/${table}`, base);
    url.searchParams.set("select", columns);
    url.searchParams.set("limit", "0");
    const response = await fetch(url, {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const hint = response.status === 401 || response.status === 403
        ? "Check the server database key."
        : response.status === 404 || response.status === 400
          ? "Check migrations 0010, 0011 and 0012."
          : "Check Supabase project health; it may be paused.";
      console.error(`FAIL: ${table} returned HTTP ${response.status}. ${hint}`);
      failures++;
    } else {
      console.log(`PASS: ${table}`);
    }
    await response.body?.cancel();
  } catch (error) {
    console.error(`FAIL: Database connection (${error.cause?.code || error.name}). Check Supabase project health and URL.`);
    failures++;
    break;
  }
}
console.log("Email configuration is present. Verify the sender domain in Resend and complete a live login before declaring sign-in ready.");
process.exitCode = failures ? 1 : 0;

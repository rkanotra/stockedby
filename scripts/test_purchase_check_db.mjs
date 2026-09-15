import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH);
const db = new PGlite();
await db.exec(
  "create role anon; create role authenticated; create role service_role;",
);
for (const name of [
  "0010_phase2_commerce_schema.sql",
  "0011_agent_storefront.sql",
  "0012_purchase_check.sql",
])
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/" + name, import.meta.url),
      "utf8",
    ),
  );
await db.exec(
  await readFile(
    new URL("../supabase/migrations/0012_purchase_check.sql", import.meta.url),
    "utf8",
  ),
);
async function one(sql, args = []) {
  return (await db.query(sql, args)).rows[0];
}
const a = (
  await one(
    "insert into merchants(email) values('pilot@example.test') returning id",
  )
).id;
const b = (
  await one(
    "insert into merchants(email) values('other@example.test') returning id",
  )
).id;
const owner = (
  await one(
    "insert into merchants(email) values('owner@example.test') returning id",
  )
).id;
const store = (
  await one("select pc_save_store($1,'Pilot','https://shop.example') as id", [
    a,
  ])
).id;
const config = {
  label: "Fixture",
  productUrl: "https://shop.example/products/shirt",
  variantId: "123",
  confirmed: true,
};
await assert.rejects(
  db.query("select pc_save_case($1,$2,$3)", [a, store, config]),
  /Verify/,
);
await db.query("update pc_stores set verified_at=now() where id=$1", [store]);
const c = (await one("select pc_save_case($1,$2,$3) as id", [a, store, config]))
  .id;
await assert.rejects(db.query("select pc_enqueue($1,$2)", [b, c]), /not found/);
await assert.rejects(db.query("select pc_enqueue($1,$2)", [a, c]), /credits/);
await db.query("select pc_grant_credits($1,$2,3,'Pilot cohort')", [a, owner]);
await assert.rejects(
  db.query("select pc_grant_credits($1,$2,3,'Double click')", [a, owner]),
  /already/,
);
await assert.rejects(db.query("select pc_enqueue($1,$2)", [a, c]), /paused/);
await db.exec("update pc_settings set paused=false");
const run = (await one("select pc_enqueue($1,$2) as id", [a, c])).id;
assert.equal((await one("select pc_enqueue($1,$2) as id", [a, c])).id, run);
assert.equal(
  (await one("select credits from pc_accounts where merchant_id=$1", [a]))
    .credits,
  2,
);
await assert.rejects(
  db.query("select pc_save_case($1,$2,$3,$4)", [
    a,
    store,
    { ...config, label: "Changed" },
    c,
  ]),
  /current check/,
);
const claimed = await one("select * from pc_claim()");
assert.equal(claimed.id, run);
assert.equal((await db.query("select * from pc_claim()")).rows.length, 0);
assert.equal(
  (
    await one("select pc_finish($1,gen_random_uuid(),$2) as ok", [
      run,
      { verdict: "pass", checks: [] },
    ])
  ).ok,
  false,
);
await assert.rejects(
  db.query("select pc_finish($1,$2,$3)", [run, claimed.lease_token, {}]),
  /Invalid check result/,
);
await db.query(
  "update pc_cases set weekly=true,next_run_at=now() where id=$1",
  [c],
);
await db.query("select pc_finish($1,$2,$3)", [
  run,
  claimed.lease_token,
  {
    verdict: "issue",
    checks: [{ code: "subtotal", status: "issue" }],
    screenshot: "sample",
  },
]);
assert.equal(
  (await one("select weekly from pc_cases where id=$1", [c])).weekly,
  false,
);
assert.equal(
  (await one("select result from pc_runs where id=$1", [run])).result
    .screenshot,
  undefined,
);
assert.equal(
  (await one("select screenshot from pc_artifacts where run_id=$1", [run]))
    .screenshot,
  "sample",
);
const retest = (
  await one("select pc_enqueue($1,$2,$3,'retest') as id", [a, c, run])
).id;
assert.equal(
  (await one("select pc_enqueue($1,$2,$3,'retest') as id", [a, c, run])).id,
  retest,
);
await db.query("select pc_cancel($1,$2)", [a, retest]);
await db.query("select pc_cancel($1,$2)", [a, retest]);
assert.equal(
  (await one("select credits from pc_accounts where merchant_id=$1", [a]))
    .credits,
  2,
);
await db.query("select pc_save_case($1,$2,$3,$4)", [
  a,
  store,
  { ...config, label: "Changed" },
  c,
]);
await assert.rejects(
  db.query("select pc_enqueue($1,$2,$3,'retest')", [a, c, run]),
  /same saved baseline/,
);
const failed = (await one("select pc_enqueue($1,$2) as id", [a, c])).id;
const fc = await one("select * from pc_claim()");
assert.equal(fc.id, failed);
await db.query("select pc_finish($1,$2,null,'runner_unavailable')", [
  fc.id,
  fc.lease_token,
]);
await db.query("select pc_finish($1,$2,null,'runner_unavailable')", [
  fc.id,
  fc.lease_token,
]);
assert.equal(
  (await one("select credits from pc_accounts where merchant_id=$1", [a]))
    .credits,
  2,
);
const claim = (
  await one(
    "insert into manual_payment_claims(merchant_id,reference,amount_inr,product) values($1,'123456789012',100,'purchase_check') returning id",
    [a],
  )
).id;
await assert.rejects(
  db.query("select review_agent_store_payment($1,$2,'approved','checked')", [
    claim,
    owner,
  ]),
  /Wrong product/,
);
await db.query("select pc_review_payment($1,$2,'approved','Receipt matched')", [
  claim,
  owner,
]);
await db.query("select pc_review_payment($1,$2,'approved','Double click')", [
  claim,
  owner,
]);
assert.equal(
  (await one("select credits from pc_accounts where merchant_id=$1", [a]))
    .credits,
  22,
);
assert.equal(
  (await db.query("select * from agent_store_access")).rows.length,
  0,
);
const rejected = (
  await one(
    "insert into manual_payment_claims(merchant_id,reference,amount_inr,product) values($1,'223456789012',100,'purchase_check') returning id",
    [a],
  )
).id;
await db.query("select pc_review_payment($1,$2,'rejected','No receipt')", [
  rejected,
  owner,
]);
assert.equal(
  (await one("select credits from pc_accounts where merchant_id=$1", [a]))
    .credits,
  22,
);
// Worker lease recovery, second crash refund and the persisted daily cap.
await db.query("select pc_enqueue($1,$2)", [a, c]);
const stale = await one("select * from pc_claim()");
await db.query(
  "update pc_runs set lease_until=now()-interval '1 minute' where id=$1",
  [stale.id],
);
const retried = await one("select * from pc_claim()");
assert.equal(retried.id, stale.id);
assert.notEqual(retried.lease_token, stale.lease_token);
assert.equal(
  (
    await one("select pc_finish($1,$2,$3) as ok", [
      stale.id,
      stale.lease_token,
      { verdict: "pass", checks: [] },
    ])
  ).ok,
  false,
);
await db.query(
  "update pc_runs set lease_until=now()-interval '1 minute' where id=$1",
  [stale.id],
);
await db.query("select * from pc_claim()");
assert.equal(
  (await one("select status from pc_runs where id=$1", [stale.id])).status,
  "failed",
);
assert.equal(
  (await one("select credits from pc_accounts where merchant_id=$1", [a]))
    .credits,
  22,
);
await db.exec("update pc_settings set daily_limit=1");
await db.query("select pc_enqueue($1,$2)", [a, c]);
assert.equal((await db.query("select * from pc_claim()")).rows.length, 0);
// Anonymous and authenticated clients cannot read rows or invoke queue/billing RPCs.
for (const role of ["anon", "authenticated"]) {
  await db.exec("set role " + role);
  await assert.rejects(db.query("select * from pc_runs"), /permission denied/);
  await assert.rejects(
    db.query("select * from pc_claim()"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("select pc_grant_credits($1,$2,3,$3)", [a, owner, "bad"]),
    /permission denied/,
  );
  await db.exec("reset role");
}
console.log(
  "Purchase Check PostgreSQL checks passed: ownership, isolation, credits, reviews, idempotency, leases, refunds, retests, daily cap and private artifacts.",
);
await db.close();

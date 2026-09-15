// Temporary integration harness. Install @electric-sql/pglite outside the app,
// then pass its absolute module path in PGLITE_MODULE_PATH. No production DB.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.PGLITE_MODULE_PATH);
const db = new PGlite();
await db.exec(
  "create role anon; create role authenticated; create role service_role;",
);
await db.exec(
  await readFile(
    new URL(
      "../supabase/migrations/0010_phase2_commerce_schema.sql",
      import.meta.url,
    ),
    "utf8",
  ),
);
const migration = await readFile(
  new URL("../supabase/migrations/0011_agent_storefront.sql", import.meta.url),
  "utf8",
);
await db.exec(migration);
await db.exec(migration); // additive migration can be reapplied
const merchant = (
  await db.query(
    "insert into merchants(email) values('merchant@example.test') returning id",
  )
).rows[0].id;
const reviewer = (
  await db.query(
    "insert into merchants(email) values('owner@example.test') returning id",
  )
).rows[0].id;
const claim = (
  await db.query(
    "insert into manual_payment_claims(merchant_id,reference,amount_inr) values($1,'123456789012',999) returning id",
    [merchant],
  )
).rows[0].id;
assert.equal(
  (await db.query("select * from agent_store_access")).rows.length,
  0,
);
await assert.rejects(
  db.query(
    "insert into manual_payment_claims(merchant_id,reference,amount_inr) values($1,'123456789012',999)",
    [reviewer],
  ),
);
await db.query(
  "select review_agent_store_payment($1,$2,'approved','Bank receipt checked')",
  [claim, reviewer],
);
const expiry = (
  await db.query(
    "select expires_at from agent_store_access where merchant_id=$1",
    [merchant],
  )
).rows[0].expires_at;
await db.query(
  "select review_agent_store_payment($1,$2,'approved','Repeated request')",
  [claim, reviewer],
);
assert.deepEqual(
  (
    await db.query(
      "select expires_at from agent_store_access where merchant_id=$1",
      [merchant],
    )
  ).rows[0].expires_at,
  expiry,
);
const rejected = (
  await db.query(
    "insert into manual_payment_claims(merchant_id,reference,amount_inr) values($1,'223456789012',999) returning id",
    [merchant],
  )
).rows[0].id;
await db.query(
  "select review_agent_store_payment($1,$2,'rejected','No receipt found')",
  [rejected, reviewer],
);
assert.deepEqual(
  (
    await db.query(
      "select expires_at from agent_store_access where merchant_id=$1",
      [merchant],
    )
  ).rows[0].expires_at,
  expiry,
);
const draft = JSON.stringify({
  domain: "https://example.test",
  products: [{ sku: "A" }],
});
const store = (
  await db.query(
    "insert into agent_storefronts(merchant_id,draft) values($1,$2) returning *",
    [merchant, draft],
  )
).rows[0];
await assert.rejects(
  db.query("select publish_agent_store($1,$2,$3)", [
    store.id,
    merchant,
    store.updated_at,
  ]),
);
await db.query(
  "update agent_storefronts set verified_domain='https://example.test' where id=$1",
  [store.id],
);
await assert.rejects(
  db.query("select publish_agent_store($1,$2,$3)", [
    store.id,
    reviewer,
    store.updated_at,
  ]),
);
await db.query("select publish_agent_store($1,$2,$3)", [
  store.id,
  merchant,
  store.updated_at,
]);
assert.equal(
  (await db.query("select * from agent_store_versions")).rows.length,
  1,
);
assert.equal(
  (await db.query("select published from agent_storefronts")).rows[0].published
    .domain,
  "https://example.test",
);
await db.query(
  "update agent_store_access set expires_at=now()-interval '1 day' where merchant_id=$1",
  [merchant],
);
await assert.rejects(
  db.query("select publish_agent_store($1,$2,$3)", [
    store.id,
    merchant,
    store.updated_at,
  ]),
);
await db.exec("set role anon");
await assert.rejects(db.query("select * from manual_payment_claims"));
await assert.rejects(
  db.query(
    "select review_agent_store_payment($1,$2,'approved','Unauthorized')",
    [claim, reviewer],
  ),
);
await db.close();
console.log(
  "PostgreSQL integration passed: pending/rejected do not grant access; duplicate approval is idempotent; publication requires ownership and active access; anonymous access is blocked.",
);

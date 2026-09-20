# Purchase Check: running StockedBy as one person

## What is built

Purchase Check is a bounded Shopify purchase-journey checker with a self-service merchant workspace and a private operator inbox. It automates repeat checks and prepares evidence and fix instructions. You remain responsible for verifying bank receipts, handling exceptional customer questions and deciding which integrations to support.

This is working application and worker code, verified with isolated fixtures. It is not yet a validated paid business or a production-tested integration across arbitrary merchant themes. The database was connected after the initial deployment, as recorded below. No paid launch, real-store check, live payment, outbound customer message or scheduled workflow activation was performed during the initial build.

### Production sign-in recovery — 15 September 2026

The first production login returned HTTP 503 because Vercel had no `SUPABASE_URL` or `SUPABASE_SERVICE_KEY`. The existing StockedBy Supabase project was also paused, and migrations 0010–0012 had not been applied. Resumed that project, applied those three migrations together in a transaction, verified the account/workspace tables, and saved the existing connection settings as sensitive production environment variables in Vercel with the owner's approval. The `stockedby.com` sender domain is verified in Resend.

Before declaring a deployment ready, run `node --env-file=<intended-environment-file> scripts/check-sign-in.mjs`, then complete a live sign-in. The preflight checks required configuration and table columns without reading customer records or sending mail. It does not prove email delivery or verify that the deployed environment matches the file. If the database stops responding, check its Supabase project status and resume it if paused. Environment changes require a new Vercel deployment.

### Pages

- `/purchase-check`: product page.
- `/purchase-check/demo`: interactive customer and operator examples; all sample data is clearly labeled.
- `/dashboard/purchase-check`: private customer setup, journeys, reports, credits and UPI references.
- `/dashboard/purchase-check/[id]`: private evidence and cart screenshot, available to the owning merchant and configured operator.
- `/dashboard/operations`: your payment queue, report review inbox, pilot credits and runner controls.

The former catalog prototype is retained in the repository. The main navigation, homepage and dashboard now lead to Purchase Check. `/agent-store` redirects to the new product. Keep `AGENT_STORE_SALES_ENABLED=false`; that older product's billing is separate.

## The offer and its limits

One pack adds **20 check credits** after confirmed payment. One saved journey run or retest costs one credit. A merchant can maintain five journeys across three verified stores. Weekly checks use the same balance; no automatic renewal or recurring charge is implemented. Price is intentionally unset, as requested.

Each journey specifies one product, an exact variant, one unit, expected INR price, discount and expected subtotal if relevant, delivery PIN/state and optional maximum shipping estimate. The merchant confirms these rules. Loading a variant's current price is a suggestion, not automatic approval of the baseline.

The first adapter checks:

1. Shopify product JSON and exact variant availability.
2. Unit price, with the cart's session currency confirming INR.
3. One-unit selection in an isolated Shopify Ajax cart.
4. Cart subtotal after an optional discount.
5. Standard Shopify shipping-rate estimates for the saved India PIN/state.
6. A recognizable same-store checkout contact/address step.

It does **not** prove: native visibility inside a specific AI app, general natural-language shopping ability, GoKwik or Razorpay Magic Checkout compatibility, COD eligibility, final checkout taxes/fees, payment-method availability, a successful UPI transaction, settlement, order placement or fulfillment. It does not edit a merchant's theme. Fixes are applied by the merchant using the guide, followed by a retest.

This runner is a deterministic browser agent executing an explicit task; it does not call an LLM. There is no model-provider charge per check. Hosting, browser execution and database storage still have costs. Do not advertise guaranteed revenue gains or a proven moat.

## One-time setup

### 1. Database and sign-in

Use a staging Supabase project first. Apply, in order:

1. `supabase/migrations/0010_phase2_commerce_schema.sql`
2. `supabase/migrations/0011_agent_storefront.sql`
3. `supabase/migrations/0012_purchase_check.sql`

Keep the existing `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `RESEND_API_KEY`, `FROM_EMAIL` and site URL configured for the website. Real keys stay in environment settings, never Git. The migration creates private tables and service-role-only functions. Browser clients use the authenticated Next.js API, with merchant ownership checks and same-origin mutation protection.

Set `STOCKEDBY_OPERATOR_EMAIL` to the email you use for merchant magic-link sign-in. Sign in normally, then open `/dashboard/operations`. Operator access is explicit; being the first registered user does not grant it. `STOCKEDBY_PAYMENTS_ADMIN_EMAIL` is a backwards-compatible fallback if the operator email is not set.

### 2. Worker without keeping your laptop open

The repository includes `.github/workflows/purchase-check.yml`. It runs bounded batches on GitHub Actions approximately every 30 minutes. Hosting schedules can be delayed; this is not an instant-result SLA.

In the repository's Actions secrets, set the worker's `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` for the same intended database. Set the repository **variable** `PURCHASE_CHECK_WORKER_ENABLED=true` only after the staging checks below pass. The workflow has read-only repository permissions, a concurrency group and a 12-minute timeout. It processes up to three jobs per invocation.

The database starts with checks **paused** and a **20-start daily ceiling**. Open Operations to unpause and choose the cap. Retries also count against the UTC daily limit. A worker heartbeat appears in Operations. Leave GitHub Actions failure notifications enabled for your account, and check the worker's Actions result if the heartbeat is stale. The product does not send a separate email digest.

For a local staging run, Node 24 and Chromium are required:

```sh
npm ci
npx playwright install chromium
node --env-file=.env.local scripts/purchase-check-worker.mjs
```

`PURCHASE_CHECK_BATCH_SIZE` can reduce the batch (maximum five). `PURCHASE_CHECK_CHROMIUM_PATH` optionally points at a compatible local Chromium binary. Do not run the production worker with a developer's fixture database values, or vice versa.

### 3. UPI

Keep `PURCHASE_CHECK_SALES_ENABLED=false` until all of these are supplied and checked:

- `PURCHASE_CHECK_PRICE_INR`: chosen integer INR price for 20 credits.
- `STOCKEDBY_UPI_QR_PATH`: path to your original QR under `public/brand`, such as `/brand/upi-qr.png`.
- `STOCKEDBY_UPI_ID` and `STOCKEDBY_UPI_PAYEE`: match your own QR and receiving account.
- `STOCKEDBY_SELLER_NAME` and `STOCKEDBY_SUPPORT_EMAIL`.

The customer submits a 12-digit RRN. You verify the actual bank receipt, amount, payee and reference in your banking app, then approve or reject in Operations. Approval adds 20 credits atomically. Double approvals do not issue another pack. Rejecting adds no credits. One pending claim per merchant and a unique reference prevent duplicate claims across both retained products.

The website cannot independently authenticate your static QR's bank receipt. Never approve based only on the submitted reference or a customer's screenshot. Real payment refunds remain a bank action handled by you; the application's automatic refunds are **check credits** for failed jobs, not money transfers.

### 4. Google Analytics

StockedBy uses its own GA4 property and web stream (`G-9VY22VHR43`) under the same Google Analytics account as Finpeel. The production deployment receives it through `NEXT_PUBLIC_GA_ID`. Consent-gated GA4 wiring is present. Enhanced measurement is disabled in the GA4 stream so automatic form, click and history capture cannot bypass the custom sanitization.

Current Purchase Check client events: `purchase_check_journey_saved`, `purchase_check_queued`, `purchase_check_report_opened`. Entered store/product data, merchant email, PIN code, discount, RRN and private report IDs are excluded. These events require visitor analytics consent and are not the system of record. Use the database payment/credit ledger to measure verified paid customers. A server-to-GA purchase conversion pipeline is not implemented; a submitted UPI reference must not fire a purchase event.

## Daily routine

1. **Check runner health.** If disconnected, inspect the GitHub Actions result. If there is an incident, pause new runs in Operations. Existing leased work finishes within the bounded timeout.
2. **Review pending payments.** Match bank receipts and record the decision. Avoid changing a price while payments are in flight; claims retain the amount shown at submission.
3. **Review the exception inbox.** It contains open issues, unknown results and worker failures ordered oldest first (up to 100 at a time, with the total backlog count). Passing reports do not enter that inbox; fresh passing checks cannot hide an older open issue. Open the private evidence, use the fix guide and copy a reply draft only when useful. Nothing sends automatically.
4. **Verify a retest.** A reported issue becomes a verified fix only when the same expected rules pass on a subsequent check. A review acknowledgement is not a proof of correction.

Stay within one supported storefront type while onboarding your first merchants. If a store needs custom scripts, an external checkout or frequent manual diagnosis, explain the unsupported scope and stop its schedule. Do not take unlimited implementation work for a fixed check-pack price.

## How jobs and credits behave

- Saving a verified store and purchase rules is free. Starting a check reserves one credit in a transaction.
- Repeated clicks while a case is queued/running return the existing job without another debit.
- Cancelling a queued job returns one credit, once. A running job cannot be cancelled through the merchant UI.
- Completed reports can contain unknown steps and still consume a credit; the limits are shown before purchase.
- Infrastructure/worker failures return the credit. An expired lease can be retried once; a second expired lease fails and refunds. Stale workers cannot save results after a new lease is issued.
- Non-passing reports and worker failures pause that journey's weekly schedule. It stays paused until the merchant explicitly enables it again.
- Low credits or a lost verification stop scheduled runs. The merchant sees a schedule note.
- Changing the expected rules creates a new baseline and pauses scheduling. The old report remains unchanged; it cannot be described as a successful same-baseline retest.
- Pilot grants are recorded and limited to one grant of 1–20 credits per merchant.

## Evidence, security and retention

Every browser context is fresh and destroyed after the run. Requests use a capped TLS transport that resolves and pins a public IPv4 address, limits hosts and methods, and handles redirects as new intercepted requests. Unsupported redirects become unknown. Private/network-local destinations, websocket connections and payment-changing requests are blocked. Script content cannot change the saved test rules or access Supabase credentials. IPv6-only storefronts are currently unsupported.

The runner retains structured expected/observed assertions and a cart screenshot where available. Screenshots are separate from report summaries and deleted after 30 days when a worker runs. They are only read through the private report page. No checkout/customer screenshot, session cookie, payment credential or full response body is saved in the report.

The operator's review note is shown to the merchant. Keep it factual and avoid pasting credentials or bank details. Credit records are retained for reconciliation. Fulfill deletion requests through an authorized account deletion workflow; there is no self-service delete-account button in this release.

## Verification commands and launch gate

```sh
npm test
npm run lint
npm run build
npm run test:purchase-check:browser
PGLITE_MODULE_PATH=/absolute/path/to/@electric-sql/pglite/dist/index.js npm run test:purchase-check:db
```

The PostgreSQL harness uses an in-memory test database and fixtures. The browser harness routes every request to an in-memory Shopify fixture: it tests a passing journey, wrong discount, wrong variant, blocked shipping, external checkout, isolated cookies and payment-route blocking. It does not contact a live store.

Before taking real payments, use a merchant-authorized **staging Shopify store** to verify your particular theme and checkout behavior, then check one real-store pre-payment path with the merchant's permission. Validate login, ownership tags, three customer journeys, credit grants, private report access from two different accounts, a bank-reference review in staging, worker reconnect/recovery and disabled scheduling. Keep payments closed until the original QR, pricing and support details are correct.

### Remaining activation inputs

Database connectivity, migrations and the StockedBy GA4 property were completed during production setup. Operator email, worker repository secrets and activation, original UPI details and launch price are still required. Publishing the website through Vercel does not enable the worker or open payments.

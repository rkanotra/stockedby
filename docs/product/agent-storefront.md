# Agent Storefront — local foundation, not a validated paid product

## Owner decisions

- Focus on making stores usable by AI agents, not recommendation monitoring.
- Use the owner's existing UPI QR, with manual verification of received funds.
- Price will be chosen later. Sales remain disabled.
- Google Analytics is requested; a StockedBy property/measurement ID is not supplied yet.

## Current assessment

A manually maintained catalog is useful infrastructure but is easy to copy and creates extra merchant work. It is not, by itself, a compelling moat or proven reason to subscribe. This implementation remains a local prototype; it has not been deployed or presented as a validated paid launch.

The stronger product hypothesis is a repeatable agent shopping test: given a product, variant, budget and destination, identify whether an agent can find the right item, understand availability and delivery, and reach a valid checkout handoff. Show evidence, fix the blocker, and rerun the same task. The agent task runner is not implemented in this prototype. Do not market catalog-completeness checks as agent execution tests.

Potential defensibility would come from maintained commerce integrations and a permissioned history of actual task failures, fixes and retests. This requires customer adoption and reliable evidence; no moat is claimed today.

Validate with 3–5 paid, hands-on pilots before building out a subscription. Measure willingness to pay, accepted fixes, repeat requests, support time and gross margin. Stop or change the offer if merchants do not value the outcome.

## Implemented foundation

- /agent-store: product introduction; /agent-store/demo: local, unsaved catalog builder.
- Up to 25 product/variant entries with INR prices, explicit stock status, delivery/return notes and same-domain product URLs.
- Authenticated drafts; ownership verification using a homepage meta tag and existing guarded fetching.
- Publication requires verified ownership and active access. Private version snapshots and publication history.
- Public catalog HTML, JSON-LD product data, and a text guide. Offers older than seven days are omitted until the merchant republishes; this is a StockedBy freshness rule, not evidence of live inventory.
- Manual UPI reference submissions. Pending/rejected submissions do not grant access. Owner review requires matching actual bank receipt and amount. PostgreSQL locks and a transaction make repeated approval idempotent.
- 30-day access begins after approval. No auto-renewal. Expired access disables public catalog endpoints.
- Optional, consent-gated GA4 page views and catalog-use events. Catalog text, entered domains, email and UPI references are excluded. No purchase event is fired on a payment claim.

## Activation dependencies

1. Database: migration 0010, then 0011_agent_storefront.sql. The locally configured Supabase endpoint was unreachable during checks; no production migration was attempted.
2. Original UPI QR image, public payee name and UPI ID; seller/support details; launch price; explicit payment reviewer email. Configure `.env.example` fields only after bank/payee details are checked. Leave `AGENT_STORE_SALES_ENABLED=false` until end-to-end staging verification.
3. A separate GA4 StockedBy property in the desired account and its G-… web-stream ID. Disable enhanced measurement because the app sends its own sanitized page views. Check Realtime/DebugView, accepted/declined consent and navigation before publishing the ID.
4. Real logged-in merchant and reviewer checks against a staging DB. No real payment, email or model call was made for this prototype.

## Validation

113 unit tests pass. A temporary PGlite PostgreSQL runtime applied the migration twice and verified pending/rejected access, duplicate-reference rejection, idempotent approval, ownership/access gates, version publication and blocked anonymous access. This does not replace an end-to-end staging test of real accounts and received UPI payments.

Run the database test with `PGLITE_MODULE_PATH` pointing to an installed `@electric-sql/pglite/dist/index.js`, then `node scripts/test_agent_store_db.mjs`. That package was installed in `/private/tmp/stockedby-db-test`, not added to application dependencies.

## References

- https://schema.org/Product and https://schema.org/Offer — product/offer vocabulary, not a universal checkout integration.
- https://llmstxt.org/ — text guide convention; no promise of assistant adoption.
- https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications — page-view tracking.
- https://developers.google.com/tag-platform/security/guides/consent — consent handling.

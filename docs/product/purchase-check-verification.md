# Purchase Check verification — 15 September 2026

## Passed

- 122 unit tests across the application, including purchase baselines, uncertainty, subtotal differences, same-baseline retests, network policy, operator identity and browser-facing origin checks.
- ESLint with no errors or warnings.
- Next.js production build (57 generated routes/pages in the build output).
- In-memory PostgreSQL migration and workflow checks: repeat migration, merchant isolation, ownership, credit reservation, duplicate starts, duplicate payment approvals, rejected payments, cancellation refunds, failed-job refunds, lease recovery, stale-worker rejection, daily limits, private artifact storage, and denial of anonymous/authenticated direct database access.
- Four real Chromium runs against an entirely in-memory Shopify fixture: successful journey, failed discount, wrong variant, and blocked shipping/external checkout. Verified isolated cookies, cart screenshots and blocked payment requests. No live merchant store was checked.
- Read-only `pinnedRequest` to `https://stockedby.com`: HTTP 200, validating the public IPv4/TLS transport separately from fixtures.
- In-app browser: product landing page; customer failure report and fix guide; sample retest from six passing checks/one issue to seven passing checks with one credit deducted; operator review clears the sample exception; sample payment approval adds 20 sample credits.
- Responsive checks at 390px: operator page and customer report document width both 390px, without horizontal overflow.
- Local production HTTP checks: anonymous reads and same-origin unsigned writes return 401; cross-origin writes return 403; operator/customer pages redirect to sign-in while retaining their destination. Fixed Next.js internal-hostname handling exposed by this check.

The verified production build is available locally at `http://127.0.0.1:3001/purchase-check/demo` while its preview server is running.

## Not yet verified against live services

- Real merchant magic-link login and the new schema in the configured Supabase project.
- An authorized Shopify staging store with an actual production-like theme and shipping configuration.
- Actual bank receipt reconciliation using the owner's original UPI QR and chosen launch price.
- Scheduled GitHub worker deployment and the website's GA4 web stream.

Those are activation requirements in the operations guide. Website deployment is separate from enabling paid checks: the product page and interactive demo can be published while payments and the scheduled worker remain off. The fixture results are not a claim that every Shopify storefront or external checkout is supported.

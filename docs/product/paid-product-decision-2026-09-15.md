# StockedBy paid product decision

**Research date:** 15 September 2026

**Status:** Product recommendation. No new application code or production changes in this research turn.

**Confidence:** Moderate confidence in testing this offer; low confidence in subscription demand until merchants pay and repeat. No proven moat today.

## Decision

Test **StockedBy Purchase Check** with a small group of Indian ecommerce agencies and established D2C stores. Start as a fixed-scope, paid service that reproduces purchase failures, helps implement agreed fixes and shows a before/after retest. Build recurring monitoring only when paying customers ask for it.

The product direction remains making stores usable by AI agents. Its first commercial promise must also be valuable when a human follows an AI recommendation to the merchant's checkout. Do not make near-term revenue depend on widespread autonomous purchasing in India.

Do not launch the manually maintained Agent Storefront catalog as the paid product. Keep the code as an unpublished prototype. Authentication, payment review and analytics wiring may be reusable later; they do not validate demand.

## What changed the recommendation

| Evidence checked | What it establishes | Decision consequence |
| --- | --- | --- |
| Shopify's product-discovery documentation describes native catalog distribution and automatically served agent-discovery files. Its Knowledge Base app is free. [Product discovery](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/products), [Knowledge Base](https://apps.shopify.com/shopify-knowledge-base) | Important pieces of a generic catalog/FAQ product are already platform features. | A second merchant-maintained catalog is a weak paid starting point. |
| ShopperProbe advertises synthetic missions, exact failure evidence and targeted retests; its site is recruiting a private beta. [ShopperProbe](https://shopperprobe.com/) | The generic agent-shopping-test idea already has direct competition. It does not establish competitor traction. | Do not claim this idea is unique. Specialization and delivery quality must earn the business. |
| StoreSteady advertises paid offer/checkout evidence and rescans. Shoptest has a Shopify listing with recurring monitoring and a small number of merchant reviews. [StoreSteady pricing](https://www.storesteady.com/pricing), [Shoptest](https://apps.shopify.com/shoptest) | There is an adjacent paid category. Listings and a few self-selected reviews do not prove demand among Indian merchants. | Validate payment locally; do not infer our conversion or retention from a competitor's price page. |
| GoKwik's support article documents discount/shipping conflicts, PIN-code errors and store/platform overrides. [GoKwik support](https://gokwik.freshdesk.com/support/solutions/articles/82000925355-discounts-shipping-not-working-in-gokwik-checkout) | Concrete failures exist in local checkout integrations today. The article does not quantify their frequency or financial impact. | Start with an actual integration and a small set of reproducible failure classes. |
| Razorpay Magic Checkout requires merchant endpoints for promotions and shipping/COD eligibility and fees. Shiprocket exposes courier serviceability and delivery estimates. [Razorpay documentation](https://razorpay.com/docs/payments/magic-checkout/web/), [Shiprocket API](https://www.postman.com/shiprocketdev/shiprocket-dev-s-public-workspace/request/tp2oqp0/check-courier-serviceability) | The information is distributed across real systems. APIs can provide authoritative inputs, subject to merchant authorization and account support. | Reuse providers; do not invent delivery estimates or build a payment gateway. |
| Shopify says its ChatGPT channel requires selling to US customers and completes purchases on the merchant website. Its Google direct-checkout documentation currently requires a US-based store selling to US customers. [ChatGPT requirements](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/chatgpt), [Google requirements](https://help.shopify.com/en/manual/online-sales-channels/agentic-storefronts/google) | Eligibility differs across channels. These are Shopify-specific requirements, not a universal claim about all AI commerce in India. | Do not promise every Indian store immediate native checkout inside major AI apps. Test the supported path for each merchant. |

Official support/developer documentation takes precedence over broader launch marketing when describing availability. Vendor product pages establish advertised capabilities, not independently verified effectiveness. This was desk research, not customer discovery.

## Exact first customer

Start with an Indian ecommerce agency maintaining several active Shopify stores that use the same checkout integration. The agency already changes themes, promotions and shipping settings and has a reason to verify those changes. Its merchant clients should have current orders and a person who can approve fixes.

For the first cohort, cover **Shopify plus one integration, provisionally GoKwik** because there is documented configuration-specific failure evidence. Confirm access and recruitability before locking that choice; if the recruited stores share Razorpay Magic Checkout, use that instead. Do not promise both in the first release.

Skip stores with no sales, merchants who only want a speculative AI visibility score, and teams unwilling to provide the settings needed to establish correct expected behavior. Agency distribution is a practical acquisition hypothesis, not itself a moat.

## What the customer buys

**Promise:** “We check whether the product a shopper or AI agent selects can reach the correct checkout, identify the blocker, and verify the agreed fix.”

An illustrative test, not a measured customer result:

> Select the blue shirt in size M, apply the merchant's eligible offer, deliver to a merchant-approved Indian PIN code, and confirm the displayed total and available payment choices before payment authorization.

Each test records:

- Exact product and variant requested, rather than just whether a page opens.
- Merchant-supplied or authenticated settings that define expected behavior.
- Observed cart contents, stock, promotion, shipping, totals and payment-handoff state.
- Screenshots or API evidence, timestamp, platform/integration version and the step that failed.
- The proposed correction, what actually changed, and a repeat of the same test.

A browser agent executes the task; deterministic checks compare the observed facts with the merchant's rules. A model's guess is not the expected answer. Human review filters uncertain results in the first service version.

Use three honest result states: confirmed issue, passed within tested scope, and unable to verify. A blocked bot, required OTP or absent delivery information is not automatically a broken checkout.

### Initial paid deliverable

- One store and one checkout integration.
- Up to five important products/variants selected by the merchant.
- A small agreed matrix of PIN codes and promotion/payment scenarios, capped at roughly 20 tests.
- An evidence report and up to three agreed configuration/content fixes within scope.
- One before/after retest and a handover of the repeatable cases.

Payment completion, settlement reliability, warehouse fulfillment and actual delivery are outside a pre-payment test. Those need provider sandbox verification or separately authorized live checks. Never claim “UPI works” because a UPI button is visible. Never place live orders or manipulate payment protections to manufacture a passing result.

## Why someone might pay

The buyer pays for a resolved, verified problem and less time reproducing it—not merely a score. Agencies may value a consistent release check across their clients. This is a hypothesis with evidence for the problem class, not evidence that these buyers will purchase StockedBy.

Potential purchase triggers: a promotion launch, checkout migration, theme change or a reported PIN-code/discount issue. These are more specific than “prepare for the future of AI.”

Price is intentionally not set; the owner deferred it. The first engagement should be fixed-price and paid up front after scope agreement. Include onboarding, analysis, fixes and retest time in the cost, not just browser/API usage. A low monthly price cannot be assumed to support hands-on integration work.

## What could become defensible

The first feature is copyable. Defensibility would need to develop through repeated paid delivery:

1. **Maintained integration behavior:** dependable test adapters for specific checkout versions, store settings and failure modes. A generic browser agent can click; the hard work is knowing which outcomes are correct and distinguishing defects from blocked/unsupported paths.
2. **Verified failure-to-fix records:** expected vs observed behavior, confirmed cause, exact change and successful retest. These can improve diagnosis and reduce irrelevant alerts. Raw screenshots or a large count of model runs are not enough.
3. **A customer's release workflow:** their actual purchase rules and regression cases become part of routine releases, supported by trustworthy history and easy export. Retention should come from usefulness, not trapped data.
4. **Agency relationships:** repeat deployment across client portfolios could reduce acquisition and onboarding costs. Competitors can pursue the same channel, so this is an advantage to earn rather than an exclusive right.

Only aggregate reusable failure patterns with appropriate customer permission; do not turn private catalog, order or customer data into a presumed shared asset. Operational history can create a useful advantage without guaranteeing a large or permanent moat. Platforms and competing QA providers can still copy successful capabilities.

The current local India query bank contains 101 categories, 404 questions and 184 inline ChatGPT/Gemini snapshots, all dated 21 August 2026. This is useful seed material, not evidence of a longitudinal fix-outcome database. No live customer or payment data was analyzed in this research.

## Validation before another large build

These are proposed decision gates, not market statistics or forecasts.

### First 10 qualified conversations

Ask for evidence of the last relevant failure, not whether AI sounds interesting:

- What failed most recently? Which product, discount, PIN code or payment choice?
- Who noticed, how was it reproduced and how long did the fix take?
- What do you currently use to test releases? Where does it fail you?
- Which store and change would you let us test now?
- Who controls the budget, and will they pay for the stated deliverable?

Do not count praise, waitlist signups or “send me details” as willingness to pay. Do not send outreach without the owner's instructions.

### A small paid cohort

Aim for three paid store engagements, ideally sourced through two agencies, after the owner sets a price. Record labor time and actual cash collected. Have the merchant confirm each reported issue against their intended behavior. Do not invent issues on healthy stores; the baseline test is still an honest deliverable.

### Advance to recurring software only if

- At least two initial customers pay for another check, a second store or a recurring plan.
- Repeated jobs share a meaningful set of test/fix patterns rather than requiring a new custom project every time.
- Customers act on the findings and trust the evidence.
- The service has positive contribution after delivery labor and infrastructure costs.
- Repeated checks catch meaningful changes; static weekly reprints of the same score do not count.

If those conditions fail, retain the free tools and stop expanding this product. If customers pay for implementation but not monitoring, operate it as a scoped service rather than forcing a subscription.

## Technical path after validation

1. Reuse the existing audit, merchant authentication and guarded fetching where appropriate.
2. Create a merchant-authorized test store or staging setup on the selected platform and integration. Build a small, explicit task/assertion runner with replayable traces.
3. Add a known-failure fixture suite: wrong variant, changed promotion threshold, wrong shipping/COD fee, unsupported PIN code, out-of-stock option, inaccessible payment handoff. Test unknown/error states too.
4. Record the merchant's approved baseline and execute only the allowed pre-payment operations. Use provider test modes for deeper payment checks.
5. Keep fixes manual and reviewed until the same correction recurs across multiple customers; automate that specific change with a diff, approval and rollback.
6. Add scheduled checks after merchant changes once repeat demand is established. A broad UCP/ACP/MCP compatibility badge is not a substitute for testing the actual supported channel.

## UPI and analytics

The owner's existing UPI QR can collect fees for these first StockedBy engagements. It does not enable agent payments on client stores. Confirm actual bank receipt before starting/activating access. Keep the original QR, payee, support details and price pending until supplied.

StockedBy's own GA4 property should measure its acquisition funnel: visits, test starts/completions, qualified leads and verified paid conversion. The current local code only implements consent-gated page views and selected feature-use events; the complete funnel and a GA4 property remain to be activated. Client-store conversion measurement is a separate integration and cannot be inferred from StockedBy's analytics.

Keep the existing free website live, retain the unpublished catalog prototype, and use a clear fixed-scope pilot offer once customer access and pricing are agreed. No automatic outreach, production deployment, paid scans or real financial actions were performed for this recommendation.

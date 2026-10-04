---
title: "The Shopify Checkout Testing Checklist for Indian D2C Stores"
metaTitle: "Shopify Checkout Testing India: Variant, Discount & Delivery Checklist | StockedBy"
description: "A practical Shopify checkout testing checklist for Indian D2C stores: variants, cart prices, discount codes, delivery PIN codes and the handoff to payment."
slug: "shopify-checkout-testing-india"
date: "2026-10-04"
---

A Shopify store can look perfect and still lose an order between the product page and payment.

The wrong size reaches the cart. A campaign code stops working. A Bengaluru PIN code returns no delivery option. A price changes after the shopper has already decided to buy. These failures are easy to miss because each page works when viewed on its own.

The useful test is the whole buying journey.

## Start with one exact purchase

Do not begin with “check the website.” That instruction is too broad to produce a useful result.

Write down one purchase your team expects to work:

> Blue linen shirt, size M, quantity one. Apply WELCOME10. Deliver to 560001. Stop before payment.

That sentence gives the test a product, variant, quantity, offer and destination. It also creates a baseline your team can repeat after a theme release, campaign launch or catalog update.

## 1. Confirm the exact product is readable

Open the public product URL in a fresh browser session. Check the product title, current price, availability and primary image.

Pay special attention to products that have recently been renamed, moved between collections or duplicated for a campaign. A working homepage link does not prove the exact product URL is still useful to a shopper or an automated shopping tool.

## 2. Select the intended variant

Choose the exact size, colour or pack in the test instruction. Then confirm the selected option is visible and remains selected when the item reaches the cart.

This catches a common class of failures: the product page shows “M,” but the cart receives the default “S”; the colour label changes but the selected variant ID does not; an unavailable option can still be added.

The correct result is not simply “item added.” The cart must contain the intended variant.

## 3. Compare product-page and cart prices

Record the price before adding the item. Record it again in the cart. If an automatic offer is expected, write down whether it should appear before or after the cart step.

Discounts can depend on the product, order subtotal, customer status and combination rules. Shopify’s own guidance recommends testing discount combinations through checkout and confirms that a merchant can stop before payment when checking a code. See [Shopify’s discount-combination guidance](https://help.shopify.com/en/manual/discounts/discount-combinations).

Check these separately:

- the product price;
- the selected variant’s price;
- the cart subtotal;
- the discount amount;
- the total before delivery and payment.

If the numbers differ, the report should show which step introduced the difference.

## 4. Test a real Indian delivery PIN code

Delivery availability is part of the offer. A product is not truly buyable for a shopper if checkout cannot produce a delivery option for their location.

Use a PIN code from a market you actively serve. Continue far enough to see whether checkout accepts the destination and presents the expected delivery path. Shopify notes that shipping options only appear after a delivery address is entered and that gaps in configured ranges can leave the buyer with no available rate. See [Shopify’s shipping-options documentation](https://help.shopify.com/en/manual/fulfillment/setup/shipping-options/setting-up-shipping-options).

Repeat this test for high-volume regions and any location with special shipping rules.

## 5. Reach checkout, then stop before payment

The journey should confirm that checkout opens with the correct item, variant, quantity and price. It does not need to submit a real payment.

Shopify recommends test orders during store setup and after payment-setting changes because the process checks more than the payment screen: inventory, shipping, taxes, notifications and order processing can all be affected. See [Shopify’s test-order guidance](https://help.shopify.com/en/manual/checkout-settings/test-orders).

For a routine journey check, stopping before payment is safer and faster. Use Shopify’s supported test modes when you need to validate the payment and post-order path as well.

## 6. Save evidence that another person can review

“It failed” is not enough for a developer or agency to act on.

A useful report should include:

- the exact journey instruction;
- the expected result at each step;
- what the browser actually observed;
- the final cart or checkout screenshot;
- a specific fix direction;
- a retest linked to the original failure.

This turns checkout testing into an operating process instead of a one-off opinion.

## When should an Indian Shopify store repeat the test?

Run the journey again after changes that can alter product or checkout behaviour:

- a theme deployment;
- a new discount campaign;
- a product or variant import;
- a shipping-zone change;
- installation or removal of a cart app;
- a checkout or payment-provider change;
- a major sale or festive campaign launch.

Keep the list small. Five important buying journeys that run consistently are more useful than a large checklist nobody repeats.

## A simple result format

Use three outcomes for each step:

1. **Passed within scope** — the observed result matched the expectation.
2. **Needs a fix** — the journey completed, but the product, variant, price, offer or delivery result was wrong.
3. **Unable to verify** — a challenge, custom checkout or blocked browser prevented a trustworthy conclusion.

That last state matters. Uncertainty should not be reported as a pass.

## Run the journey with StockedBy

[StockedBy Purchase Check](https://stockedby.com/purchase-check) saves the exact product, variant, expected price, offer and Indian delivery PIN code. It runs the standard Shopify journey in an isolated browser, records the evidence and lets you repeat the same check after a fix.

The founding India pilot supports standard Shopify storefronts and stops before payment. Store setup is free, with no automatic renewal.

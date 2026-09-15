import { formatMoney, verdict } from "./model.js";
export const GUIDES = {
  product: [
    "Check the product’s Online Store availability and the exact variant link.",
    "Open the saved product URL in a private window. Confirm it is published and available in the India market.",
  ],
  variant: [
    "Check the saved variant and its stock rules in Shopify.",
    "Confirm the option exists and the intended inventory/continue-selling setting matches this journey.",
  ],
  price: [
    "Check variant pricing and India market pricing.",
    "Compare the variant’s price with the intended baseline. If your intended price changed, edit the journey instead of changing a correct store.",
  ],
  cart: [
    "Check the variant’s cart behavior.",
    "Review quantity rules, selling-plan requirements, bundles and cart apps. Repeat with one unit of this exact variant.",
  ],
  subtotal: [
    "Check discount conditions and competing automatic discounts.",
    "Review minimum spend, eligible variants, start/end times and combination settings. Confirm the expected subtotal excludes shipping and separately added tax.",
  ],
  shipping: [
    "Check shipping profiles and delivery eligibility.",
    "Review this variant’s profile, India region, PIN code restrictions and weight/price thresholds. Compare against your checkout provider’s own rules.",
  ],
  checkout: [
    "Inspect the checkout handoff in a private window.",
    "Try the same product and cart. A bot challenge, external checkout or required login needs manual/provider-specific verification; it does not establish a broken checkout.",
  ],
  payment: [
    "Verify payment completion separately in your provider’s test mode.",
    "This check never supplies a payment credential, submits a payment or places an order.",
  ],
  ownership: [
    "Restore your StockedBy verification tag.",
    "Add the tag to the published homepage head and verify your store again.",
  ],
};
export function check(code, title, status, expected, observed, detail) {
  return {
    code,
    title,
    status,
    expected: String(expected),
    observed: String(observed),
    detail,
    guide: GUIDES[code] || GUIDES.product,
  };
}
export function unknown(code, title, detail) {
  return check(
    code,
    title,
    "unknown",
    "Evidence from the store",
    "Not verified",
    detail,
  );
}
export function evaluatePurchase(config, evidence) {
  const checks = [];
  const product = evidence.product;
  if (!product || !Array.isArray(product.variants)) {
    checks.push(
      unknown(
        "product",
        "Product data",
        "The supported Shopify product endpoint could not be read. Password protection, a bot challenge or an unsupported storefront may be the cause.",
      ),
    );
  } else {
    checks.push(
      check(
        "product",
        "Product data",
        "pass",
        "Readable product and variant data",
        product.title || "Product returned",
        "Read from this product’s Shopify endpoint.",
      ),
    );
    const variant = product.variants.find(
      (v) => String(v.id) === config.variantId,
    );
    if (!variant)
      checks.push(
        check(
          "variant",
          "Exact variant",
          "issue",
          config.variantId,
          "Variant absent from product data",
          "The saved variant does not appear in the product response.",
        ),
      );
    else {
      const available =
        typeof variant.available === "boolean" ? variant.available : null;
      checks.push(
        check(
          "variant",
          "Variant availability",
          available === null
            ? "unknown"
            : available === config.expectedAvailable
              ? "pass"
              : "issue",
          config.expectedAvailable ? "Available" : "Unavailable",
          available === null
            ? "Not returned"
            : available
              ? "Available"
              : "Unavailable",
          "Compared with your saved availability rule.",
        ),
      );
      const correctCurrency = evidence.cart?.currency === "INR";
      checks.push(
        check(
          "price",
          "Unit price",
          !correctCurrency || !Number.isInteger(variant.price)
            ? "unknown"
            : variant.price === config.expectedPricePaise
              ? "pass"
              : "issue",
          formatMoney(config.expectedPricePaise),
          correctCurrency
            ? formatMoney(variant.price)
            : "INR could not be confirmed",
          "Product price before discounts. The cart response confirms the session currency.",
        ),
      );
    }
  }
  const cart = evidence.cart;
  const item = cart?.items?.find(
    (i) => String(i.variant_id || i.id) === config.variantId,
  );
  if (!config.expectedAvailable) {
    checks.push(
      unknown(
        "cart",
        "Cart selection",
        "This baseline expects an unavailable variant. A cart and checkout attempt was intentionally skipped.",
      ),
    );
  } else if (!cart || !evidence.addOk)
    checks.push(
      unknown(
        "cart",
        "Cart selection",
        "The runner could not confirm an add-to-cart response. This may be an app restriction or unsupported route; it is not automatically a checkout defect.",
      ),
    );
  else
    checks.push(
      check(
        "cart",
        "Cart selection",
        item?.quantity === 1 && cart.item_count === 1 ? "pass" : "issue",
        "One unit of the saved variant",
        item
          ? `${item.quantity} unit(s); ${cart.item_count} total item(s)`
          : "Expected variant missing",
        "Read back from the isolated session’s cart after adding one unit.",
      ),
    );
  const expectedTotal = config.expectedCartPaise ?? config.expectedPricePaise;
  checks.push(
    check(
      "subtotal",
      "Cart subtotal",
      cart?.currency !== "INR" ||
        !Number.isInteger(cart?.total_price) ||
        !item ||
        !evidence.addOk
        ? "unknown"
        : cart.total_price === expectedTotal
          ? "pass"
          : "issue",
      formatMoney(expectedTotal),
      cart?.currency === "INR"
        ? formatMoney(cart.total_price)
        : "Not confirmed in INR",
      "Cart subtotal after discounts. Shipping and separately added checkout taxes are outside this value.",
    ),
  );
  const rates = evidence.shipping?.shipping_rates;
  if (!Array.isArray(rates) || cart?.currency !== "INR")
    checks.push(
      unknown(
        "shipping",
        "Delivery estimate",
        `No supported Shopify shipping estimate in a confirmed INR session was returned for PIN ${config.pin}. Provider-specific PIN rules and COD need their own verification.`,
      ),
    );
  else if (!rates.length)
    checks.push(
      check(
        "shipping",
        "Delivery estimate",
        "issue",
        `At least one Shopify rate for ${config.pin}`,
        "No Shopify rates returned",
        "This confirms a mismatch in the standard Shopify estimator only. An external checkout may calculate its own rates.",
      ),
    );
  else {
    const prices = rates
      .filter((r) =>
        /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(r.price ?? "")),
      )
      .map((r) => Math.round(Number(r.price) * 100));
    const min = prices.length ? Math.min(...prices) : null;
    checks.push(
      check(
        "shipping",
        "Delivery estimate",
        min === null
          ? "unknown"
          : config.maxShippingPaise !== null && min > config.maxShippingPaise
            ? "issue"
            : "pass",
        config.maxShippingPaise === null
          ? `A rate for ${config.pin}`
          : `A rate at or below ${formatMoney(config.maxShippingPaise)}`,
        min === null
          ? "Rate amount not readable"
          : `Lowest estimate ${formatMoney(min)}`,
        "A Shopify estimate, not a delivery guarantee or final provider checkout charge.",
      ),
    );
  }
  checks.push(
    evidence.checkout?.recognized
      ? check(
          "checkout",
          "Checkout handoff",
          "pass",
          "A recognizable checkout contact/address step",
          "Checkout step observed",
          "The runner opened the checkout and stopped before entering personal or payment information.",
        )
      : unknown(
          "checkout",
          "Checkout handoff",
          evidence.checkout?.reason ||
            "A supported checkout step could not be identified.",
        ),
  );
  return {
    verdict: verdict(checks),
    checks,
    scope:
      "Shopify product, isolated Ajax cart, shipping estimate and observed checkout entry. Payment, final tax/fees, COD, UPI and fulfillment are not tested.",
    adapter: "shopify-standard-v1",
    checkedAt: new Date().toISOString(),
  };
}

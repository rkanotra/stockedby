import assert from "node:assert/strict";
import { chromium } from "playwright";
import { runPurchase } from "../lib/purchaseCheck/runner.js";
import { demoConfig } from "../lib/purchaseCheck/demo.js";
// In-memory Shopify fixture. No requests are made to any real merchant.
const origin = "https://fixture.example";
const config = {
  ...demoConfig,
  productUrl: origin + "/products/everyday-shirt",
};
let sessions = 0;
function fixture({
  discountWorks = true,
  wrongVariant = false,
  blockedShipping = false,
  externalCheckout = false,
} = {}) {
  const calls = [],
    states = new Map();
  const transport = async (url, init) => {
    const u = new URL(url),
      path = u.pathname;
    calls.push({ path, method: init.method });
    const cookie = init.headers.cookie || "";
    const token = cookie.match(/cart=(fixture\d+)/)?.[1];
    let state = states.get(token);
    if (!state) {
      state = { added: false, discount: false };
    }
    const json = (value) => ({
      status: 200,
      headers: { "content-type": "application/json" },
      body: Buffer.from(JSON.stringify(value)),
    });
    if (path === "/products/everyday-shirt") {
      const id = "fixture" + ++sessions;
      states.set(id, state);
      return {
        status: 200,
        headers: {
          "content-type": "text/html",
          "set-cookie": [`cart=${id}; Path=/; Secure; HttpOnly; SameSite=Lax`],
        },
        body: Buffer.from(
          '<html><h1>Fixture shirt</h1><script>fetch("/payments/submit",{method:"POST"}).catch(()=>{});fetch("https://malicious.example/probe").catch(()=>{});</script></html>',
        ),
      };
    }
    if (path === "/products/everyday-shirt.js")
      return json({
        title: "Fixture shirt",
        variants: [
          {
            id: config.variantId,
            title: "Blue / M",
            price: 149900,
            available: true,
          },
        ],
      });
    if (path === "/cart/clear.js") {
      state.added = false;
      return json({});
    }
    if (path === "/cart/add.js") {
      assert.ok(token, "browser must retain its isolated cart cookie");
      state.added = true;
      return json({ items: [{ id: config.variantId }] });
    }
    if (path === "/cart/update.js") {
      state.discount = discountWorks;
      return json({});
    }
    if (path === "/cart.js")
      return json({
        currency: "INR",
        item_count: state.added ? 1 : 0,
        items: state.added
          ? [
              {
                variant_id: wrongVariant ? "999" : config.variantId,
                quantity: 1,
              },
            ]
          : [],
        total_price: state.discount ? 134910 : 149900,
      });
    if (path === "/cart/prepare_shipping_rates.js")
      return blockedShipping
        ? {
            status: 403,
            headers: { "content-type": "text/html" },
            body: Buffer.from("challenge"),
          }
        : json({});
    if (path === "/cart/async_shipping_rates.json")
      return json({ shipping_rates: [{ price: "0.00" }] });
    if (path === "/cart")
      return {
        status: 200,
        headers: { "content-type": "text/html" },
        body: Buffer.from(
          "<html><h1>Your cart</h1><p>Blue shirt · M</p></html>",
        ),
      };
    if (path === "/checkout")
      return {
        status: 302,
        headers: {
          location: externalCheckout
            ? "https://unapproved.example/checkout"
            : origin + "/checkouts/c/fixture/information",
        },
        body: Buffer.from(""),
      };
    if (path === "/checkouts/c/fixture/information")
      return {
        status: 200,
        headers: { "content-type": "text/html" },
        body: Buffer.from(
          '<html><h1>Contact</h1><input autocomplete="email"/><input autocomplete="shipping address-line1"/></html>',
        ),
      };
    return {
      status: 404,
      headers: { "content-type": "text/html" },
      body: Buffer.from("Not found"),
    };
  };
  return { transport, calls };
}
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PURCHASE_CHECK_CHROMIUM_PATH
    ? { executablePath: process.env.PURCHASE_CHECK_CHROMIUM_PATH }
    : {}),
});
try {
  const good = fixture();
  const pass = await runPurchase(browser, { origin }, config, {
    transport: good.transport,
    verify: false,
  });
  assert.equal(pass.verdict, "pass", JSON.stringify(pass.checks));
  assert.ok(pass.screenshot);
  assert.ok(pass.network.restricted >= 1);
  assert.equal(
    good.calls.some((c) => /payments/.test(c.path)),
    false,
  );
  const bad = fixture({ discountWorks: false });
  const issue = await runPurchase(browser, { origin }, config, {
    transport: bad.transport,
    verify: false,
  });
  assert.equal(issue.verdict, "issue");
  assert.equal(issue.checks.find((c) => c.code === "subtotal").status, "issue");
  const wrong = fixture({ wrongVariant: true });
  const variant = await runPurchase(browser, { origin }, config, {
    transport: wrong.transport,
    verify: false,
  });
  assert.equal(variant.checks.find((c) => c.code === "cart").status, "issue");
  assert.equal(
    wrong.calls.some((c) => c.path === "/checkout"),
    false,
  );
  const challenge = fixture({ blockedShipping: true, externalCheckout: true });
  const unknown = await runPurchase(browser, { origin }, config, {
    transport: challenge.transport,
    verify: false,
  });
  assert.equal(unknown.verdict, "unknown");
  assert.equal(
    unknown.checks.find((c) => c.code === "shipping").status,
    "unknown",
  );
  assert.equal(
    unknown.checks.find((c) => c.code === "checkout").status,
    "unknown",
  );
  assert.equal(sessions, 4);
  console.log(
    "Browser fixtures passed: isolated cookies, product/cart/discount/shipping/checkout evidence, screenshots, wrong variant, unknown states and blocked payment/network requests. No live store contacted.",
  );
} finally {
  await browser.close();
}

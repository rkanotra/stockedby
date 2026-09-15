import { allowedRequest, pinnedRequest, storeText } from "./network.js";
import { hasOwnershipMeta } from "../agentStore/verification.js";
import { evaluatePurchase } from "./assertions.js";

// Deliberately deterministic: a store's scripts/content cannot add new tools,
// change the merchant baseline or authorize a purchase. Each run has a fresh
// browser context. All network traffic passes through the pinned transport.
export async function runPurchase(
  browser,
  store,
  config,
  { transport = pinnedRequest, verify = true } = {},
) {
  if (verify) {
    const html = await storeText(store.origin, store.origin);
    if (!hasOwnershipMeta(html, store.verification_token))
      throw new Error("ownership_lost");
  }
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "en-IN",
    serviceWorkers: "block",
    acceptDownloads: false,
  });
  let count = 0,
    blocked = 0;
  const redirects = new Map();
  const deadline = setTimeout(() => context.close().catch(() => {}), 150000);
  try {
    await context.routeWebSocket("**/*", (socket) => socket.close());
    await context.route("**/*", async (route) => {
      const req = route.request();
      if (
        ++count > 100 ||
        !allowedRequest(req.url(), req.method(), store.origin)
      ) {
        blocked++;
        return route.abort("blockedbyclient").catch(() => {});
      }
      try {
        const response = await transport(req.url(), {
          method: req.method(),
          headers: await req.allHeaders(),
          body: req.postDataBuffer(),
        });
        if (
          response.status >= 300 &&
          response.status < 400 &&
          response.headers.location
        ) {
          const target = new URL(response.headers.location, req.url()).href;
          const method =
            response.status === 303 ||
            (["POST"].includes(req.method()) &&
              [301, 302].includes(response.status))
              ? "GET"
              : req.method();
          if (!allowedRequest(target, method, store.origin)) {
            blocked++;
            return route.abort("blockedbyclient");
          }
          // Browser network redirects can bypass Playwright routing. Return a
          // marker and let our bounded navigation/fetch helpers issue a fresh
          // intercepted request; never expose an unpinned redirect to Chromium.
          redirects.set(req.url(), target);
          return route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({ stockedbyRedirect: target, method }),
          });
        }
        const headers = {};
        for (const [key, value] of Object.entries(response.headers)) {
          if (
            [
              "transfer-encoding",
              "content-length",
              "connection",
              "content-encoding",
            ].includes(key)
          )
            continue;
          headers[key] = Array.isArray(value)
            ? value.join("\n")
            : String(value);
        }
        await route.fulfill({
          status: response.status,
          headers,
          body: response.body,
        });
      } catch {
        blocked++;
        await route.abort("failed").catch(() => {});
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    page.on("dialog", (d) => d.dismiss().catch(() => {}));
    context.on("page", (p) => {
      if (p !== page) p.close().catch(() => {});
    });
    async function navigate(url) {
      let target = url;
      for (let i = 0; i < 4; i++) {
        redirects.delete(target);
        const response = await page.goto(target, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });
        const next = redirects.get(target);
        if (!next) return response;
        target = next;
      }
      throw new Error("too_many_redirects");
    }
    await navigate(config.productUrl + "?variant=" + config.variantId);
    if (new URL(page.url()).origin !== store.origin)
      throw new Error("unsupported_redirect");
    const locale =
      config.productUrl.match(
        /https:\/\/[^/]+(\/[a-z]{2}(?:-[a-z]{2})?)\/products\//i,
      )?.[1] || "";
    const root = locale + "/";
    const json = async (path, method = "GET", data) =>
      page.evaluate(
        async ({ path, method, data }) => {
          try {
            let next = path,
              verb = method,
              payload = data;
            for (let i = 0; i < 4; i++) {
              const response = await fetch(next, {
                method: verb,
                credentials: "same-origin",
                headers: payload ? { "Content-Type": "application/json" } : {},
                body: payload ? JSON.stringify(payload) : undefined,
                signal: AbortSignal.timeout(14000),
              });
              const value = await response.json();
              if (response.status === 409 && value.stockedbyRedirect) {
                next = value.stockedbyRedirect;
                verb = value.method;
                if (verb === "GET") payload = undefined;
                continue;
              }
              return { ok: response.ok, status: response.status, value };
            }
            return { ok: false };
          } catch {
            return { ok: false };
          }
        },
        { path, method, data },
      );
    const evidence = {};
    const product = await json(new URL(config.productUrl).pathname + ".js");
    evidence.product = product.ok ? product.value : null;
    if (config.expectedAvailable) {
      await json(root + "cart/clear.js", "POST", {});
      const added = await json(root + "cart/add.js", "POST", {
        items: [{ id: Number(config.variantId), quantity: 1 }],
      });
      evidence.addOk = added.ok;
      if (config.discount)
        await json(root + "cart/update.js", "POST", {
          discount: config.discount,
        });
    }
    const cart = await json(root + "cart.js");
    evidence.cart = cart.ok ? cart.value : null;
    if (
      evidence.addOk &&
      evidence.cart?.items?.some(
        (i) => String(i.variant_id || i.id) === config.variantId,
      )
    ) {
      const address = new URLSearchParams({
        "shipping_address[zip]": config.pin,
        "shipping_address[country]": "India",
        "shipping_address[province]": config.province,
      });
      const prepared = await json(
        root + "cart/prepare_shipping_rates.js?" + address,
        "POST",
      );
      if (prepared.ok)
        for (let attempt = 0; attempt < 3; attempt++) {
          const rates = await json(
            root + "cart/async_shipping_rates.json?" + address,
          );
          if (rates.ok && rates.value?.shipping_rates) {
            evidence.shipping = rates.value;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
    }
    // Screenshots contain the product/cart, never customer/payment details.
    let screenshot = null;
    try {
      await navigate(store.origin + root + "cart");
      screenshot = (
        await page.screenshot({
          type: "jpeg",
          quality: 45,
          fullPage: false,
          timeout: 5000,
        })
      ).toString("base64");
      if (screenshot.length > 350000) screenshot = null;
    } catch {}
    evidence.checkout = {
      recognized: false,
      reason:
        "Cart selection could not be confirmed; checkout was not attempted.",
    };
    if (
      evidence.addOk &&
      evidence.cart?.item_count === 1 &&
      evidence.cart?.items?.some(
        (i) => String(i.variant_id || i.id) === config.variantId,
      )
    ) {
      try {
        const response = await navigate(store.origin + root + "checkout");
        const url = new URL(page.url());
        const checkpoint = /checkpoint|challenge|password|login/i.test(
          url.pathname,
        );
        const fields = await page
          .locator(
            'input[autocomplete="email"], input[autocomplete="shipping email"], input[autocomplete="shipping address-line1"], input[autocomplete="address-line1"]',
          )
          .count();
        evidence.checkout = {
          recognized:
            response?.ok() &&
            url.origin === store.origin &&
            /\/checkouts?\//.test(url.pathname) &&
            !checkpoint &&
            fields > 0,
          reason:
            "A checkout contact/address step was not observed. External checkout, a challenge or an unsupported theme needs a manual check.",
        };
      } catch {
        evidence.checkout = {
          recognized: false,
          reason:
            "The checkout could not be opened within this adapter’s permitted path. This does not prove it is broken.",
        };
      }
    }
    const result = evaluatePurchase(config, evidence);
    return {
      ...result,
      screenshot,
      network: { requests: count, restricted: blocked },
      evidence: {
        productTitle: String(evidence.product?.title || "").slice(0, 200),
        currency: evidence.cart?.currency || null,
        variantId: config.variantId,
        cartSubtotalPaise: evidence.cart?.total_price ?? null,
        shippingRateCount: evidence.shipping?.shipping_rates?.length ?? null,
      },
    };
  } finally {
    clearTimeout(deadline);
    await context.close().catch(() => {});
  }
}

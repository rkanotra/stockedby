import { evaluatePurchase } from "./assertions.js";
export const demoConfig = {
  label: "Blue everyday shirt · size M",
  productUrl: "https://demo.example/products/everyday-shirt",
  variantId: "40123456789012",
  expectedPricePaise: 149900,
  pin: "560001",
  province: "Karnataka",
  discount: "WELCOME10",
  expectedCartPaise: 134910,
  maxShippingPaise: 0,
  expectedAvailable: true,
  currency: "INR",
  confirmed: true,
};
export function demoResult(fixed = false) {
  return {
    ...evaluatePurchase(demoConfig, {
      product: {
        title: "Everyday shirt",
        variants: [
          { id: demoConfig.variantId, available: true, price: 149900 },
        ],
      },
      addOk: true,
      cart: {
        currency: "INR",
        item_count: 1,
        items: [{ variant_id: demoConfig.variantId, quantity: 1 }],
        total_price: fixed ? 134910 : 149900,
      },
      shipping: { shipping_rates: [{ price: "0.00" }] },
      checkout: { recognized: true },
    }),
    checkedAt: "2026-09-15T08:30:00.000Z",
    sample: true,
  };
}
export function demoWorkspace() {
  return {
    credits: 6,
    stores: [
      {
        id: "demo-store",
        name: "Everyday Goods",
        origin: "https://demo.example",
        verified_at: "2026-09-15",
        verification_token: "sample",
      },
    ],
    cases: [
      {
        id: "demo-case",
        store_id: "demo-store",
        config: demoConfig,
        version: 1,
        weekly: false,
      },
    ],
    runs: [
      {
        id: "demo-run",
        case_id: "demo-case",
        store_id: "demo-store",
        config: demoConfig,
        status: "completed",
        source: "manual",
        result: demoResult(),
        review_status: "open",
        created_at: "2026-09-15T08:30:00.000Z",
        completed_at: "2026-09-15T08:30:00.000Z",
      },
    ],
    payments: [],
    settings: { paused: false, heartbeat_at: "2026-09-15T08:30:00.000Z" },
  };
}

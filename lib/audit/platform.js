// Regex signatures against raw homepage HTML. Order matters slightly (first
// match wins) but the patterns are specific enough that collisions are
// vanishingly unlikely between these platforms.
const PLATFORM_SIGNATURES = [
  {
    id: "shopify",
    label: "Shopify",
    patterns: [/cdn\.shopify\.com/i, /Shopify\.theme/i, /shopify-checkout-api-token/i, /cdn\.shopifycdn\.net/i],
  },
  {
    id: "woocommerce",
    label: "WooCommerce",
    patterns: [/woocommerce/i, /wp-content\/plugins\/woocommerce/i],
  },
  {
    id: "magento",
    label: "Magento",
    patterns: [/Mage\.Cookies/i, /\/skin\/frontend\//i, /Magento_[A-Za-z]+/i, /mage-init/i],
  },
  {
    id: "salla",
    label: "Salla",
    patterns: [/salla\.sa/i, /cdn\.salla\.network/i, /data-salla/i, /salla-boot/i],
  },
  {
    id: "zid",
    label: "Zid",
    patterns: [/zid\.store/i, /cdn\.zid\.store/i, /zid-theme/i],
  },
];

export function detectPlatform(html) {
  for (const sig of PLATFORM_SIGNATURES) {
    if (sig.patterns.some((p) => p.test(html))) return sig.id;
  }
  return "custom";
}

export function platformLabel(id) {
  return PLATFORM_SIGNATURES.find((s) => s.id === id)?.label || "Custom / unrecognized platform";
}

export function detectStripe(html) {
  return /js\.stripe\.com/i.test(html);
}

// Exact, platform-specific steps for pasting the generated JSON-LD +
// llms.txt onto a real store — reuses lib/audit/platform.js's detectPlatform
// id strings ("shopify"|"woocommerce"|"magento"|"salla"|"zid"|"custom") as
// the lookup key, so /fix and /audit can never disagree about which
// platform a site is on.
const INSTALL_STEPS = {
  shopify: {
    label: "Shopify",
    productJsonLd: [
      "Shopify Admin → Online Store → Themes → find your live theme → … → Edit code.",
      "Open sections/main-product.liquid (or product.liquid on older themes).",
      "Paste the JSON-LD block for that product right before {% endschema %} or just before </section> at the bottom of the file.",
      "Repeat per product, or ask a developer to loop it from your product's own fields instead of pasting per-page.",
    ],
    llmsTxt: [
      "Shopify Admin → Settings → Files → Upload file.",
      "Upload the llms.txt file exactly as downloaded (don't rename it).",
      "Shopify serves uploaded files from a CDN path, not your root domain — for a real /llms.txt URL, add a redirect: Settings → Apps and sales channels → … or ask a developer to add one via a theme app / Shopify Functions.",
    ],
  },
  woocommerce: {
    label: "WooCommerce",
    productJsonLd: [
      "WordPress Admin → Appearance → Theme File Editor (or edit via FTP/SFTP if the built-in editor is disabled on your host).",
      "Open your theme's single-product.php, or better: install a small “code snippets” plugin (e.g. WPCode) and add the JSON-LD as a snippet scoped to that product page — safer than editing theme files directly.",
      "Paste the JSON-LD block inside the page's <head>, or right before </body>.",
    ],
    llmsTxt: [
      "WordPress Admin → your hosting file manager (or FTP/SFTP) → upload llms.txt to your site's root folder (same level as wp-config.php).",
      "Visit yoursite.com/llms.txt to confirm it loads.",
    ],
  },
  magento: {
    label: "Magento",
    productJsonLd: [
      "Admin → Content → Design → Configuration → find your active theme's Design Config.",
      "Add the JSON-LD via a custom block/layout XML (Content → Blocks, or a small custom module) targeting the product page's <head> block — Magento doesn't have a simple built-in paste field, so this usually needs a developer.",
    ],
    llmsTxt: [
      "Upload llms.txt to your Magento install's webroot (pub/ folder root, alongside index.php) via FTP/SFTP or your hosting file manager.",
    ],
  },
  salla: {
    label: "Salla",
    productJsonLd: [
      "Salla Admin → Online Store → Theme → Edit code (Twilight theme editor).",
      "Open the product page template and paste the JSON-LD block before {{ end }} or just before </body>.",
    ],
    llmsTxt: [
      "Salla doesn't offer a direct root-file upload from the dashboard — upload llms.txt via your theme's custom files section if available, or ask Salla support / a developer to publish it at your store's root.",
    ],
  },
  zid: {
    label: "Zid",
    productJsonLd: [
      "Zid Admin → Online Store → Themes → Edit code.",
      "Open the product page template and paste the JSON-LD block before </body>.",
    ],
    llmsTxt: [
      "Zid doesn't offer a direct root-file upload from the dashboard — ask Zid support / a developer to publish llms.txt at your store's root, or add it via a custom theme file if your theme supports one.",
    ],
  },
  custom: {
    label: "Your website",
    productJsonLd: [
      "Open each product page's template file (or ask whoever built your site where product pages are rendered from).",
      "Paste that product's JSON-LD block inside the page's <head>, or just before </body>.",
    ],
    llmsTxt: [
      "Upload llms.txt to your website's root folder — the same folder as your homepage file — so it's reachable at yoursite.com/llms.txt.",
    ],
  },
};

export function getInstallInstructions(platformId) {
  return INSTALL_STEPS[platformId] || INSTALL_STEPS.custom;
}

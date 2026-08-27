// Exact, platform-specific steps for pasting the generated JSON-LD +
// llms.txt onto a real store — reuses lib/audit/platform.js's detectPlatform
// id strings ("shopify"|"woocommerce"|"magento"|"salla"|"zid"|"custom") as
// the lookup key, so /fix and /audit can never disagree about which
// platform a site is on. One click/action per line, arrow-chained through
// the admin path, ending in the actual save action — written for a
// non-technical shop owner following along click by click, not a developer
// skimming a paragraph.
const INSTALL_STEPS = {
  shopify: {
    label: "Shopify",
    productJsonLd: [
      "Shopify Admin → Online Store → Themes.",
      "Next to your live theme, click ⋯ → Edit code.",
      "Open sections/main-product.liquid (or product.liquid on older themes).",
      "Paste this product's code just above </section> at the bottom of the file.",
      "Click Save.",
      "Repeat for each product — or ask a developer to loop it from your product fields instead of pasting one by one.",
    ],
    llmsTxt: [
      "Shopify Admin → Settings → Files.",
      "Click Upload file → select the llms.txt file you downloaded.",
      "Shopify serves uploaded files from a CDN link, not yoursite.com/llms.txt directly — ask a developer to add a redirect if you need that exact address to work.",
    ],
  },
  woocommerce: {
    label: "WooCommerce",
    productJsonLd: [
      "WordPress Admin → Plugins → Add New.",
      "Search \"WPCode\" → Install Now → Activate.",
      "Code Snippets → Add Snippet → Add Your Custom Code (New Snippet).",
      "Choose HTML Snippet, then paste this product's code.",
      "Under Insertion, choose Page Specific and select this product's page.",
      "Click Save Snippet, then switch it to Active.",
    ],
    llmsTxt: [
      "Open your hosting file manager (or connect via FTP/SFTP).",
      "Go to your site's root folder — the same folder as wp-config.php.",
      "Upload llms.txt there.",
      "Visit yoursite.com/llms.txt to confirm it loads.",
    ],
  },
  magento: {
    label: "Magento",
    productJsonLd: [
      "Admin → Content → Blocks → Add New Block.",
      "Paste this product's code as the block content and give it an identifier.",
      "Admin → Content → Design → Configuration → your theme → Edit.",
      "Add the block to the product page's layout (or ask a developer — Magento has no simple built-in paste field for this).",
      "Click Save.",
    ],
    llmsTxt: [
      "Open your hosting file manager (or connect via FTP/SFTP).",
      "Go to your Magento install's pub/ folder — the same folder as index.php.",
      "Upload llms.txt there.",
    ],
  },
  salla: {
    label: "Salla",
    productJsonLd: [
      "Salla Admin → Online Store → Theme → Edit code.",
      "Open the product page template.",
      "Paste this product's code just before {{ end }} or before </body>.",
      "Click Save.",
    ],
    llmsTxt: [
      "Salla doesn't offer a direct root-file upload from the dashboard.",
      "Ask Salla support, or a developer, to publish llms.txt at your store's root — or add it via your theme's custom files section if available.",
    ],
  },
  zid: {
    label: "Zid",
    productJsonLd: [
      "Zid Admin → Online Store → Themes → Edit code.",
      "Open the product page template.",
      "Paste this product's code just before </body>.",
      "Click Save.",
    ],
    llmsTxt: [
      "Zid doesn't offer a direct root-file upload from the dashboard.",
      "Ask Zid support, or a developer, to publish llms.txt at your store's root — or add it via a custom theme file if your theme supports one.",
    ],
  },
  wix: {
    label: "Wix",
    productJsonLd: [
      "Wix Editor → open the product page → click Add → Embed → Custom Embeds → Embed a Widget.",
      "Paste this product's code into the HTML box (Wix wraps it in an iframe automatically).",
      "Click Update, then Publish your site.",
      "Wix Velo (if your site uses it) can do this per-product automatically — ask a developer if you have many products.",
    ],
    llmsTxt: [
      "Wix doesn't offer a direct root-file upload for most plans.",
      "Wix Editor → Settings → Custom Code, or ask Wix support how to publish a file at yoursite.com/llms.txt — availability depends on your plan.",
    ],
  },
  custom: {
    label: "Your website",
    productJsonLd: [
      "Open this product's page template file — ask whoever built your site where product pages are rendered from if you're not sure.",
      "Paste this product's code inside the page's <head>, or just before </body>.",
      "Save and publish the change.",
    ],
    llmsTxt: [
      "Upload llms.txt to your website's root folder — the same folder as your homepage file.",
      "Visit yoursite.com/llms.txt to confirm it loads.",
    ],
  },
};

export function getInstallInstructions(platformId) {
  return INSTALL_STEPS[platformId] || INSTALL_STEPS.custom;
}

// Honest framing for what's already on the site (hard rule 2: never imply
// a shop has nothing when the audit actually found something) — reads the
// exact same "before" snapshot (lib/audit/score.js's buildAuditResult,
// computed by app/api/fix/route.js) that "Verify it worked" diffs against,
// so this line can never disagree with real detected data. Falls back to a
// generic, platform-hedged note (never a specific claim) only when the
// audit genuinely found nothing and the platform is known to often ship
// partial schema by default.
export function schemaHonestNote(auditBefore, platform) {
  const checks = auditBefore?.layers?.readable?.checks || [];
  const productCheck = checks.find((c) => c.id === "product-schema");
  const homepageCheck = checks.find((c) => c.id === "homepage-schema");

  if (productCheck?.status === "pass") {
    return "Good news — the product page we checked already has complete Product schema. The code below extends that same coverage to the rest of your catalog.";
  }
  if (productCheck?.status === "warn" || homepageCheck?.status === "pass") {
    return "Already have some of this? Our audit checks what's missing — the code above fills the gaps.";
  }
  if (platform === "shopify") {
    return "Many Shopify themes already output some product schema by default. Our audit checks what's actually missing — the code above fills the gaps.";
  }
  return null;
}

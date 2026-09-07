// Up to 5 actionable, plain-language recommendations from a store's real
// readiness issues (lib/commerce/readiness.js's scoreStore().issues) —
// mirrors lib/founderReport.js's buildFounderActions(): every item traced
// to a real, named signal, never generic filler, capped so the dashboard
// doesn't turn into a wall of text. Phase 2 constraint: recommendations
// ONLY — nothing here generates or applies a fix (that's a later phase,
// same boundary the free /audit tool already draws against /fix).
const RECOMMENDATION_COPY = {
  has_price: {
    title: "Add a real price to every product",
    severity: "blocker",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} have no price an AI shopping agent could use to complete a purchase.`,
  },
  has_availability: {
    title: "Add availability/inventory info",
    severity: "blocker",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} don't say whether they're in stock.`,
  },
  is_active: {
    title: "Publish or remove draft/archived products",
    severity: "blocker",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} aren't published/active yet.`,
  },
  has_handle: {
    title: "Fix products missing a URL",
    severity: "blocker",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} have no URL handle at all.`,
  },
  has_unique_sku: {
    title: "Give every variant a unique SKU",
    severity: "important",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} are missing a clear, unique SKU.`,
  },
  has_description: {
    title: "Write a real product description",
    severity: "important",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} have little or no description text for AI to read.`,
  },
  has_images: {
    title: "Add at least one image per product",
    severity: "important",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} have no images.`,
  },
  has_title: {
    title: "Give every product a real title",
    severity: "important",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} have a missing or too-short title.`,
  },
  has_product_type: {
    title: "Set a product type/category",
    severity: "minor",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} have no category, making them harder for AI to place.`,
  },
  has_tags: {
    title: "Add tags to help AI understand your catalog",
    severity: "minor",
    detail: (n) => `${n} product${n === 1 ? "" : "s"} have no tags at all.`,
  },
};

const SEVERITY_ORDER = { blocker: 0, important: 1, minor: 2 };

export function buildRecommendations(storeScore, maxItems = 5) {
  if (!storeScore?.issues?.length) return [];
  return storeScore.issues
    .map((issue) => {
      const copy = RECOMMENDATION_COPY[issue.code];
      if (!copy) return null; // never invent a recommendation for an unrecognized check code
      return {
        code: issue.code,
        title: copy.title,
        severity: copy.severity,
        detail: copy.detail(issue.affectedCount),
        affectedCount: issue.affectedCount,
        exampleProductTitles: issue.exampleProductTitles,
      };
    })
    .filter(Boolean)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.affectedCount - a.affectedCount)
    .slice(0, maxItems);
}

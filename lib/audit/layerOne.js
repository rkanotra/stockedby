// Plain-language Layer 1 for the Agent Readiness Audit, parallel to
// lib/layerOne.js for the shelf report. Deliberately computed from ONLY
// the discoverable+readable layers of lib/audit/score.js's result — the
// transactable layer (UCP/ACP manifests, agent-compatible payment) is
// still-roadmap infrastructure (CLAUDE.md: "agent identity & trust and
// transaction risk are still roadmap"), and the site philosophy is no
// roadmap content on public pages. Layer 2 ("See technical details") shows
// all three layers, including transactable, exactly as score.js computed
// them — this file only ever affects the Layer 1 summary above it.

const PLAIN_VERDICT = {
  CAN_READ: "YES, AI CAN READ YOUR SHOP",
  PRODUCTS_MISSING: "AI CAN READ YOUR SHOP, BUT NOT YOUR PRODUCTS",
  CANT_READ: "AI CAN'T READ YOUR SHOP",
};

// The one place the three verdict states map to real checks — was
// previously a SEPARATE computation (an average-of-scores threshold) from
// the findings list below, which could disagree with each other: a real
// production bug rendered a green "YES, AI CAN READ YOUR SHOP" directly
// above a "what's wrong" card saying AI can't see product prices, because
// the readable layer's AVERAGE score could clear the pass threshold even
// while the product-schema check specifically failed. Both the verdict
// and the findings now read the exact same checks array, so they can't
// drift apart.
//
//   CANT_READ         — robots blocks AI bots (site effectively
//                        unreachable to them), or the homepage has no
//                        structured data at all (AI can't tell what the
//                        shop even sells) — either one is worse than a
//                        product-data gap, not just "some problems."
//   PRODUCTS_MISSING   — reachable and the homepage IS readable, but the
//                        product-schema check failed or was incomplete
//                        (or, in the same "some problems but not blocked"
//                        spirit, any other single check like /llms.txt
//                        failed on its own) — genuinely readable, but not
//                        the full picture.
//   CAN_READ           — every discoverable+readable check passed.
function computeLayer1VerdictKey(checks) {
  const robotsBlocked = checks.some((c) => c.id.startsWith("robots-") && c.status === "fail");
  const homepageUnreadable = checks.find((c) => c.id === "homepage-schema")?.status === "fail";
  if (robotsBlocked || homepageUnreadable) return "CANT_READ";

  const productStatus = checks.find((c) => c.id === "product-schema")?.status;
  const productIncomplete = productStatus === "fail" || productStatus === "warn";
  const anyOtherFailure = checks.some(
    (c) => c.status === "fail" && !c.id.startsWith("robots-") && c.id !== "homepage-schema" && c.id !== "product-schema"
  );
  if (productIncomplete || anyOtherFailure) return "PRODUCTS_MISSING";

  return "CAN_READ";
}

// One finding per real problem area — up to 4, matching the number of
// discoverable+readable checks this maps from (robots is collapsed to one
// finding regardless of how many bots are blocked). Never invents a
// finding: each only fires when its underlying check actually failed. Most
// severe first (item 3): blocked > can't-be-summarized > can't-tell-what-
// you-sell > product-data-incomplete.
// `why` (business consequence) and `tier` ("fix-first" | "then") are the
// business-impact structure the founder-facing findings card and audit
// action plan both read — "What we found / Why it matters / What to do",
// most-severe first, same ordering "fix-first" tier items already sort
// ahead of "then" ones.
const FINDING_RULES = [
  {
    tier: "fix-first",
    applies: (checks) => checks.some((c) => c.id.startsWith("robots-") && c.status === "fail"),
    finding: "AI apps can't visit your website.",
    why: "Those systems have no way to discover your products at all, so they can never recommend you.",
    fix: "Remove the block in robots.txt so AI apps can visit.",
  },
  {
    tier: "fix-first",
    applies: (checks) => checks.find((c) => c.id === "homepage-schema")?.status === "fail",
    finding: "AI apps can't tell what your shop sells.",
    why: "Without basic shop information, AI can't summarize or recommend your store to shoppers.",
    fix: "Add basic shop information AI apps can read.",
  },
  {
    tier: "then",
    applies: (checks) => checks.find((c) => c.id === "llms-txt")?.status === "fail",
    finding: "AI apps don't have a summary of your shop.",
    why: "Optional, emerging infrastructure — it gives AI a direct, structured summary instead of guessing from your page content.",
    fix: "Add a short AI-readable summary file to your website.",
  },
  {
    tier: "then",
    applies: (checks) => ["fail", "warn"].includes(checks.find((c) => c.id === "product-schema")?.status),
    finding: "AI apps can't see your product prices.",
    why: "Without structured price and availability data, AI may recommend you with inaccurate details — or pick a competitor whose data is clearer.",
    fix: "Add product information AI apps can read.",
  },
];

export function buildAuditLayerOne(result) {
  const relevantChecks = (result?.checks || []).filter((c) => c.layer !== "transactable");
  const findings = FINDING_RULES.filter((r) => r.applies(relevantChecks))
    .slice(0, 4)
    .map((r) => ({ finding: r.finding, why: r.why, fix: r.fix, tier: r.tier }));

  let verdictKey = computeLayer1VerdictKey(relevantChecks);
  // Contradiction guard (item 2): structurally this shouldn't be reachable
  // — both verdictKey and findings read the same checks array above — but
  // this is the backstop against a future edit adding a FINDING_RULE
  // without updating computeLayer1VerdictKey (or vice versa) ever
  // rendering a contradictory screen again. `contradiction` is surfaced so
  // the server (app/api/audit/route.js) can log it — this function itself
  // stays pure/client-safe and never calls logSystemEvent directly.
  const contradiction = findings.length > 0 && verdictKey === "CAN_READ";
  if (contradiction) verdictKey = "PRODUCTS_MISSING";

  return { verdict: PLAIN_VERDICT[verdictKey], findings, contradiction };
}

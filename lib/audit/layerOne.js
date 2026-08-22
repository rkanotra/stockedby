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
  SOME_PROBLEMS: "SOME PROBLEMS",
  CANT_READ: "AI CAN'T READ YOUR SHOP",
};

function computeLayer1Verdict(discoverableScore, readableScore) {
  if (discoverableScore !== null && discoverableScore < 30) return "CANT_READ";
  const scores = [discoverableScore, readableScore].filter((s) => s !== null);
  if (scores.length === 0) return "CANT_READ";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 70 && scores.every((s) => s >= 50)) return "CAN_READ";
  return "SOME_PROBLEMS";
}

// One finding per real problem area — up to 4, matching the number of
// discoverable+readable checks this maps from (robots is collapsed to one
// finding regardless of how many bots are blocked). Never invents a
// finding: each only fires when its underlying check actually failed.
const FINDING_RULES = [
  {
    applies: (checks) => checks.some((c) => c.id.startsWith("robots-") && c.status === "fail"),
    finding: "AI apps can't visit your website.",
    fix: "Remove the block in robots.txt so AI apps can visit.",
  },
  {
    applies: (checks) => checks.find((c) => c.id === "llms-txt")?.status === "fail",
    finding: "AI apps don't have a summary of your shop.",
    fix: "Add a short AI-readable summary file to your website.",
  },
  {
    applies: (checks) => checks.find((c) => c.id === "homepage-schema")?.status === "fail",
    finding: "AI apps can't tell what your shop sells.",
    fix: "Add basic shop information AI apps can read.",
  },
  {
    applies: (checks) => ["fail", "warn"].includes(checks.find((c) => c.id === "product-schema")?.status),
    finding: "AI apps can't see your product prices.",
    fix: "Add product information AI apps can read.",
  },
];

export function buildAuditLayerOne(result) {
  const { layers, checks } = result;
  const verdictKey = computeLayer1Verdict(layers.discoverable.score, layers.readable.score);
  const findings = FINDING_RULES.filter((r) => r.applies(checks))
    .slice(0, 4)
    .map((r) => ({ finding: r.finding, fix: r.fix }));
  return { verdict: PLAIN_VERDICT[verdictKey], findings };
}

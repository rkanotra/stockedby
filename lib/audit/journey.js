// Founder-facing Find -> Understand -> Buy journey for the redesigned
// /audit (visually consistent with lib/founderReport.js's Discover ->
// Consider -> Buy journey on /test — same 3-stage shape, different
// domain). Reads only from lib/audit/score.js's buildAuditResult() output
// (`{ domain, platform, verdict, layers }`) — no new checks, no new
// fetching, never a fabricated status. lib/audit/score.js's layerScore()
// already excludes "unknown" checks from the average, so "not checked"
// never inflates toward "ready" here either.
import { AI_BOTS } from "./robots.js";

const STAGE_LABELS = { find: "Find", understand: "Understand", buy: "Buy" };

// Same status vocabulary for all three stages — including Buy, which can
// genuinely read "Not ready" (the redesign brief's own examples use it).
// What differs for Buy is the DETAIL copy callers show alongside it
// (forward-framed "future-ready" language, since UCP/ACP/agentic
// checkout is emerging infrastructure, not a current standard) — never
// the status word itself, so the three stages stay visually comparable.
export function stageStatus(score) {
  if (score === null) return "Not checked";
  if (score < 30) return "Not ready";
  if (score < 70) return "Needs work";
  return "Ready";
}

const HEADLINES = [
  {
    when: (s) => s.find === "Ready" && s.understand === "Ready" && s.buy === "Ready",
    headline: "Your store is ready for AI shopping.",
  },
  {
    when: (s) => s.find === "Not ready",
    headline: "Some AI platforms may struggle to access your store.",
  },
  {
    when: (s) => s.find === "Needs work",
    headline: "Your store is partially discoverable by AI.",
  },
  {
    when: (s) => (s.find === "Ready" || s.find === "Not checked") && (s.understand === "Not ready" || s.understand === "Needs work"),
    headline: "AI can reach your store, but may not fully understand your products.",
  },
  {
    when: (s) => s.find === "Ready" && s.understand === "Ready" && (s.buy === "Not ready" || s.buy === "Needs work"),
    headline: "Your store is discoverable and readable, but isn't ready for agent-driven purchasing yet.",
  },
];

// A small decision table over the three REAL statuses — genuinely
// responsive to the combination, never one fixed "AI CAN'T READ YOUR
// SHOP"-style string regardless of what actually passed.
export function buildAuditHeadline(stages) {
  const byKey = Object.fromEntries(stages.map((s) => [s.key, s.status]));
  const match = HEADLINES.find((h) => h.when(byKey));
  return match ? match.headline : "Your store is only partially ready for AI.";
}

export function buildAuditJourney(result) {
  const layers = result?.layers || {};
  const stages = [
    { key: "find", label: STAGE_LABELS.find, score: layers.discoverable?.score ?? null },
    { key: "understand", label: STAGE_LABELS.understand, score: layers.readable?.score ?? null },
    { key: "buy", label: STAGE_LABELS.buy, score: layers.transactable?.score ?? null },
  ].map((s) => ({ ...s, status: stageStatus(s.score) }));

  return { stages, headline: buildAuditHeadline(stages) };
}

// ---------- Crawler summary ----------
// Groups the 6 individual AI_BOTS checks (lib/audit/robots.js) into 4
// platform buckets a founder actually recognizes — "3 major AI crawler
// rules need attention" instead of 6 unlabeled bot rows. Per-bot detail
// (exact User-Agent, robots rule) stays available via LayerCard.js's
// existing unchanged Layer-2 disclosure; this function only summarizes.
const CRAWLER_GROUPS = [
  { platform: "OpenAI", bots: ["GPTBot", "OAI-SearchBot"] },
  { platform: "Google AI", bots: ["Google-Extended"] },
  { platform: "Anthropic", bots: ["ClaudeBot", "anthropic-ai"] },
  { platform: "Perplexity", bots: ["PerplexityBot"] },
];

export function buildCrawlerSummary(checks) {
  const byId = Object.fromEntries((checks || []).map((c) => [c.id, c]));
  const groups = CRAWLER_GROUPS.map((g) => {
    const botChecks = g.bots.map((bot) => byId[`robots-${bot}`]).filter(Boolean);
    const restricted = botChecks.length > 0 && botChecks.some((c) => c.status === "fail");
    return { platform: g.platform, restricted, bots: g.bots };
  });
  return {
    groups,
    restricted: groups.filter((g) => g.restricted),
    accessible: groups.filter((g) => !g.restricted),
  };
}

// Sanity export for callers that want to confirm the bot list this file's
// grouping assumes hasn't drifted from lib/audit/robots.js's own list.
export const CRAWLER_BOT_COUNT = AI_BOTS.length;

// ---------- Check importance (Layer 2) ----------
// Emerging standards must never read as a mandatory current requirement
// (brief sections 39/61) — robots/homepage/product checks are today's
// real requirements; llms.txt is optional/emerging; UCP/ACP/payment are
// future-ready. Derived from the check's own `layer`/`id`, never a new
// data field to keep in sync.
export function checkImportance(check) {
  if (check.id === "llms-txt") return "Optional / emerging";
  if (check.layer === "transactable") return "Future-ready";
  return "Important now";
}

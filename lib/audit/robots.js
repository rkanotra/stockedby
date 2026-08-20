// The six AI-crawler user-agents this audit checks for.
export const AI_BOTS = ["GPTBot", "OAI-SearchBot", "Google-Extended", "ClaudeBot", "anthropic-ai", "PerplexityBot"];

// Groups consecutive User-agent lines into one rule set; a new group starts
// once a Disallow/Allow directive has been seen since the last User-agent
// line (per the de-facto robots.txt convention — RFC 9309 §2.2.1).
function parseRobotsTxt(text) {
  const groups = new Map(); // lowercased agent -> { allow: string[], disallow: string[] }
  let currentAgents = [];
  let sawDirectiveSinceAgent = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      if (sawDirectiveSinceAgent) {
        currentAgents = [];
        sawDirectiveSinceAgent = false;
      }
      const agent = value.toLowerCase();
      currentAgents.push(agent);
      if (!groups.has(agent)) groups.set(agent, { allow: [], disallow: [] });
    } else if (key === "disallow" || key === "allow") {
      sawDirectiveSinceAgent = true;
      currentAgents.forEach((a) => groups.get(a)?.[key].push(value));
    }
  }
  return groups;
}

// Simplified on purpose: real robots.txt precedence is longest-path-match-
// wins across every rule. This audit only answers "can this AI bot get in
// the door at all" — a root-level `Disallow: /` (unless overridden by an
// equally-broad `Allow: /`) reads as blocked; anything narrower reads as
// allowed, since the bot can still reach most of the site.
function isBotBlocked(groups, botName) {
  const rules = groups.get(botName.toLowerCase()) || groups.get("*");
  if (!rules) return { blocked: false, matchedAgent: null };
  const blocksRoot = rules.disallow.includes("/");
  const allowsRoot = rules.allow.includes("/");
  const matchedAgent = groups.has(botName.toLowerCase()) ? botName : "*";
  return { blocked: blocksRoot && !allowsRoot, matchedAgent };
}

// Returns { exists, bots: [{ bot, blocked, matchedAgent }] }. When the file
// doesn't exist, every bot is implicitly allowed (the open-web default).
export function evaluateRobotsTxt(text) {
  if (text === null) {
    return { exists: false, bots: AI_BOTS.map((bot) => ({ bot, blocked: false, matchedAgent: null })) };
  }
  const groups = parseRobotsTxt(text);
  return {
    exists: true,
    bots: AI_BOTS.map((bot) => ({ bot, ...isBotBlocked(groups, bot) })),
  };
}

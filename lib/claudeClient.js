import Anthropic from "@anthropic-ai/sdk";

// Hard rule 7 (CLAUDE.md): cost ceiling <=$0.05/test — fixed model, no
// generation call, web_search capped at 2 uses/query, sentiment on haiku.
const MODEL = "claude-sonnet-4-6";
const SENTIMENT_MODEL = "claude-haiku-4-5";

let _client = null;
function client() {
  if (!_client) _client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
  return _client;
}

function extractJSON(content) {
  const text = (content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in Claude reply");
  return JSON.parse(text.slice(start, end + 1));
}

const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

// Ported from docs/prototype-app.jsx askShoppingAssistant(). Extracts the
// query fanout from server_tool_use blocks and trusted sources from
// web_search_tool_result blocks — the real telemetry, not an estimate.
export async function askShoppingAssistant(queryText) {
  const prompt = `You are an AI shopping assistant helping a real customer. Their question: "${queryText}".
Search the web if helpful. Recommend exactly 5 specific options, ranked best first. Name the actual BRAND for each.
For EACH recommendation also state where you would send the customer to BUY it:
- "destination": exactly one of "brand-direct", "marketplace", "aggregator", "none"
- "destination_domain": the specific site, e.g. "levi.in" or "amazon.ae"
Respond with ONLY valid JSON, no markdown fences:
{"recommendations":[{"brand":"","product":"","why":"","destination":"","destination_domain":""}]}`;

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
    tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 2 }],
  });

  const searches = (res.content || [])
    .filter((b) => b.type === "server_tool_use" && b.name === "web_search")
    .map((b) => b.input?.query)
    .filter(Boolean);

  const citations = [];
  (res.content || [])
    .filter((b) => b.type === "web_search_tool_result")
    .forEach((b) => {
      // A server-tool error comes back as an object, not a list — guard before indexing.
      const items = Array.isArray(b.content) ? b.content : [];
      items.forEach((item) => {
        if (item?.type === "web_search_result" && item.url) {
          const d = domainOf(item.url);
          if (d) citations.push(d);
        }
      });
    });

  const parsed = extractJSON(res.content);
  return { recs: (parsed.recommendations || []).slice(0, 5), searches, citations };
}

// Ported from docs/prototype-app.jsx analyzeSentiment() — moved to haiku per
// hard rule 7 (aux calls run on haiku, not the sonnet shopping-assistant model).
export async function analyzeSentiment(brand, mentions) {
  const prompt = `A brand "${brand}" was recommended by AI shopping assistants. How they described it:
${mentions.map((m, i) => `${i + 1}. "${m}"`).join("\n")}
Analyze how AI positions this brand. ONLY valid JSON, no markdown:
{"sentiment":"positive|neutral|negative","positioning":"2-5 word label","summary":"one sentence for the founder"}`;

  const res = await client().messages.create({
    model: SENTIMENT_MODEL,
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });
  return extractJSON(res.content);
}

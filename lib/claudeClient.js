import Anthropic from "@anthropic-ai/sdk";
import { MARKET_LOCALE } from "./scoring";

// Hard rule 7 (CLAUDE.md): cost ceiling <=$0.05/test — fixed model, no
// generation call, web_search capped at 2 uses/query, sentiment on haiku.
// (generateCustomQueries below is a deliberate exception to "no generation
// call" — it's the custom-category flow's own one-off, not part of the
// per-test cost this rule bounds.)
const MODEL = "claude-sonnet-4-6";
const SENTIMENT_MODEL = "claude-haiku-4-5";
// Custom-category query generation: sonnet over haiku on purpose — avoiding
// template collapse, unrealistic budgets, and a problem-first query that
// accidentally names the category are genuinely harder generative calls
// than sentiment labeling, and the output is 4 short sentences, so sonnet's
// extra cost here is negligible regardless.
const GENERATE_MODEL = MODEL;

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
//
// timeoutMs is the TOTAL wall-clock budget for this call, including any
// pause_turn continuation below — not just the first attempt's own SDK
// timeout. app/api/test/query/route.js (the single-query endpoint each
// question now runs as its own request from, so no one Vercel invocation
// risks the platform's duration ceiling) passes a hard cap here; the
// continuation's own timeout is whatever's left of that budget, never more.
//
// maxUses caps web_search's max_uses (default 2). The problem-first
// archetype's open-ended "what should I use for X" phrasing tends to
// trigger the longest, most search-heavy turns — app/api/test/query passes
// maxUses: 1 for that archetype specifically to cut its worst-case time,
// leaving the other archetypes' full 2 searches untouched.
export async function askShoppingAssistant(queryText, { timeoutMs = 50_000, maxUses = 2 } = {}) {
  const prompt = `You are an AI shopping assistant helping a real customer. Their question: "${queryText}".
Search the web if helpful. Recommend exactly 5 specific options, ranked best first. Name the actual BRAND for each.
For EACH recommendation also state where you would send the customer to BUY it:
- "destination": exactly one of "brand-direct", "marketplace", "aggregator", "none"
- "destination_domain": the specific site, e.g. "levi.in" or "amazon.ae"
Respond with ONLY valid JSON, no markdown fences:
{"recommendations":[{"brand":"","product":"","why":"","destination":"","destination_domain":""}]}`;

  // maxRetries must be 0 here: the SDK retries a timeout by default, so a
  // "50s timeout" with the default 2 retries can actually take 3x that —
  // well past the caller's own hard ceiling — before ever surfacing as an
  // error. The caller (app/api/test/query) does its own single retry
  // instead, as a fresh separate request, with a full fresh budget.
  const tools = [{ type: "web_search_20260209", name: "web_search", max_uses: maxUses }];
  const messages = [{ role: "user", content: prompt }];
  const start = Date.now();
  let res = await client().messages.create(
    { model: MODEL, max_tokens: 2000, messages, tools },
    { timeout: timeoutMs, maxRetries: 0 }
  );

  // Anthropic's server-side web-search loop can pause mid-turn
  // (stop_reason: "pause_turn") on a search-heavy question, before any
  // final text/JSON is generated — the previous code took res.content as
  // final regardless, so a paused turn threw "No JSON in Claude reply"
  // every time, deterministically, for the same query (a content-blind
  // retry doesn't fix this — it hits the same pause again). Resuming once
  // by echoing the paused turn back, per Anthropic's documented pattern,
  // gives the model room to finish — but only within whatever's left of
  // timeoutMs's TOTAL budget, so this can never push the call past the
  // caller's hard cap (skip the continuation entirely if there's too
  // little budget left for it to plausibly finish; extractJSON will then
  // throw below, same as any other real failure).
  const allContent = [...res.content];
  if (res.stop_reason === "pause_turn") {
    const remaining = timeoutMs - (Date.now() - start);
    if (remaining > 5_000) {
      messages.push({ role: "assistant", content: res.content });
      res = await client().messages.create(
        { model: MODEL, max_tokens: 2000, messages, tools },
        { timeout: remaining, maxRetries: 0 }
      );
      allContent.push(...res.content);
    }
  }

  const searches = allContent
    .filter((b) => b.type === "server_tool_use" && b.name === "web_search")
    .map((b) => b.input?.query)
    .filter(Boolean);

  const citations = [];
  allContent
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

  // The final JSON only ever lands in the LAST turn's content (the first
  // turn, by definition, didn't have it — that's why we resumed).
  const parsed = extractJSON(res.content);
  return { recs: (parsed.recommendations || []).slice(0, 5), searches, citations };
}

// Ported from docs/prototype-app.jsx analyzeSentiment() — moved to haiku per
// hard rule 7 (aux calls run on haiku, not the sonnet shopping-assistant model).
//
// Caller only invokes this with >=2 real mentions (route.js) — never fewer,
// and never fabricate a sentiment for a brand the LLM merely recognizes.
// The prompt exists specifically to stop the model from filling gaps with
// outside/training knowledge about the brand: a real bug had this call
// describe "Pilgrim" using facts from an unrelated same-named company. Every
// claim in the output must trace to the excerpts given, nothing else — but
// the grounding instruction itself must not leak into the summary text (a
// second real bug: telling the model to stay "grounded in the excerpts
// above" made it literally write sentences like "based on the excerpts
// provided..."). The summary has to read as a plain, direct description,
// with no trace of how it was produced.
export async function analyzeSentiment(brand, mentions) {
  const prompt = `You are analyzing ONLY the excerpts below. Do not use any outside or prior
knowledge you may have about a brand called "${brand}" — there may be more than
one real company with this name, and the one in these excerpts is the only one
that matters here.

Verbatim excerpts from AI shopping assistants explaining why they recommended
"${brand}" in this test:
${mentions.map((m, i) => `${i + 1}. "${m}"`).join("\n")}

Based ONLY on the language in these excerpts, analyze how these AI assistants
are positioning "${brand}". Do not invent history, ingredients, founding story,
or any other detail not stated above.

The "summary" you write must read as a plain, direct statement about the
brand — as if you simply know this about it. Never mention that you are
analyzing excerpts, mentions, quotes, inputs, or "the text above"; never
write phrases like "based on the provided...", "according to the
excerpts...", or "grounded in...". Just state the positioning.

ONLY valid JSON, no markdown:
{"sentiment":"positive|neutral|negative","positioning":"2-5 word label","summary":"one plain sentence for the founder, with zero mention of excerpts, mentions, or sources"}`;

  const res = await client().messages.create(
    {
      model: SENTIMENT_MODEL,
      max_tokens: 400,
      messages: [{ role: "user", content: prompt }],
    },
    { timeout: 10_000, maxRetries: 0 }
  );
  return extractJSON(res.content);
}

// Strips <script>/<style>/<svg> blocks (pure noise for product data — often
// the bulk of a page's bytes) before truncating, so the token budget goes
// toward actual markup/text instead of JS bundles. Not a full sanitizer —
// this HTML is never rendered, only read by the model as text.
function stripHtmlNoise(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "");
}

const PRODUCT_EXTRACT_MAX_CHARS = 45_000; // ~11k tokens, generous for haiku at this price point

// Fix Generator (app/api/fix/route.js): pulls real product data out of one
// product page's raw HTML — never invents a field. Haiku only, same cost
// discipline as analyzeSentiment (hard rule 7) — this runs up to 8 times
// per /fix run, the highest-volume Claude call in the app, so it has to be
// the cheapest model. Returns null (not a fabricated partial object) when
// the page doesn't look like a real product page at all, or when the
// model's reply can't be parsed — app/api/fix/route.js reports that
// question's page as "couldn't parse," never invents data.
export async function extractProductData(html, url) {
  const truncated = stripHtmlNoise(html).slice(0, PRODUCT_EXTRACT_MAX_CHARS);
  const prompt = `You are extracting real product data from the raw HTML of one e-commerce page. Only report a field if it is ACTUALLY present in the HTML below — never guess, estimate, or invent a value. Use null for anything you can't find.

Page URL: ${url}

HTML:
${truncated}

If this page is not really a product page (e.g. it's an error page, a category listing with no single product, a login page, or has no real product content), respond with exactly: {"name": null}

Otherwise respond with ONLY this JSON, no markdown fences, no other text:
{"name": "the exact product name as shown, or null", "price": a plain number (no currency symbol) or null, "currency": "3-letter ISO code (e.g. INR, AED, SAR, USD) or null", "availability": "InStock" or "OutOfStock" or "PreOrder", or null if not stated, "image": "the main product image's absolute URL, or null", "description": "one real sentence about the product taken or closely paraphrased from the page, or null", "brand": "the brand/manufacturer name as shown, or null"}`;

  const res = await client().messages.create(
    { model: SENTIMENT_MODEL, max_tokens: 600, messages: [{ role: "user", content: prompt }] },
    { timeout: 20_000, maxRetries: 0 }
  );

  let parsed;
  try {
    parsed = extractJSON(res.content);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || !parsed.name) return null;

  return {
    name: parsed.name,
    price: parsed.price ?? null,
    currency: parsed.currency || null,
    availability: parsed.availability || null,
    image: parsed.image || null,
    description: parsed.description || null,
    brand: parsed.brand || null,
  };
}

const CUSTOM_QUERY_ARCHETYPES = ["category-discovery", "category-discovery", "branded-routing", "problem-first"];

// Adapted from docs/stockedby-data-kit.md §2b's Query Bank Generation
// Prompt, narrowed from "a batch of 8-10 categories" to exactly one
// merchant-typed category, and with query 3 asking about the MERCHANT'S OWN
// brand directly (passed in from the test form) instead of a generated
// "leader_brand" placeholder — there's no leader to guess here.
function customQueryPrompt({ market, categoryName, brand, locale }) {
  return `You are generating shopper queries for a market-research query bank. Market: ${market}. Local currency: ${locale.currencyLabel}. Local language: ${locale.languageLabel} (language code "${locale.languageCode}").

A merchant testing whether AI recommends brands in their category just typed this category name: "${categoryName}"
Their own brand, for the branded-routing query only: "${brand}"

Write EXACTLY 4 queries a real shopper would type, one per line item below:

1. archetype "category-discovery" (language "en") — MUST include a concrete budget in ${locale.currencyLabel} realistic for "${categoryName}" in ${market}, plus a use-case, occasion, or context detail.
2. archetype "category-discovery" (language "${locale.languageCode}") — written the way locals actually type: colloquial, code-mixed where natural. A DIFFERENT angle from query 1, not a translation of it.
3. archetype "branded-routing" (language "en") — the shopper already wants to buy "${brand}" specifically and asks where to buy it genuinely / cheapest / fastest. Name "${brand}" in the text. Do not name any other brand.
4. archetype "problem-first" (language "en") — the shopper describes only the PROBLEM this category solves, in their own words. The category name/label ("${categoryName}") and any close paraphrase of it must NOT appear anywhere in the text.

HARD RULES:
- No placeholders, no brackets, no template language.
- Never copy the category label verbatim if it contains slashes or parentheses — say it the way a human would.
- Sound like a real person typing on their phone: contractions and small imperfections are fine.
- The English discovery query (1) must contain a number.

Output ONLY this JSON, nothing else:
{"queries":[
{"qid":"custom-discovery","text":"","archetype":"category-discovery","intent":"commercial","language":"en"},
{"qid":"custom-local","text":"","archetype":"category-discovery","intent":"commercial","language":"${locale.languageCode}"},
{"qid":"custom-branded","text":"","archetype":"branded-routing","intent":"commercial","language":"en"},
{"qid":"custom-problem","text":"","archetype":"problem-first","intent":"commercial","language":"en"}
]}`;
}

// Canonical qid per archetype — assigned server-side rather than trusting
// Claude's own "qid" field verbatim, so a slightly-off generation still
// produces uniquely-keyed, predictably-shaped rows downstream.
function assignQid(archetype, isFirstDiscovery) {
  if (archetype === "category-discovery") return isFirstDiscovery ? "custom-discovery" : "custom-local";
  if (archetype === "branded-routing") return "custom-branded";
  if (archetype === "problem-first") return "custom-problem";
  return `custom-${archetype || "query"}`;
}

// Used by app/api/generate-queries for the free-text "custom category" path
// (search had no bank match): 4 fresh queries for categoryName+market,
// never written into data/*.json (hard rule: custom categories stay out of
// the canonical bank — see CLAUDE.md repo map / build phase 4 TODO).
export async function generateCustomQueries({ market, categoryName, brand }) {
  const locale = MARKET_LOCALE[market];
  if (!locale) throw new Error(`No locale config for market "${market}".`);

  const res = await client().messages.create(
    {
      model: GENERATE_MODEL,
      max_tokens: 700,
      messages: [{ role: "user", content: customQueryPrompt({ market, categoryName, brand, locale }) }],
    },
    { timeout: 20_000, maxRetries: 0 }
  );

  const parsed = extractJSON(res.content);
  const queries = Array.isArray(parsed.queries) ? parsed.queries : [];
  if (queries.length !== 4) {
    throw new Error("Query generation returned an unexpected number of questions — please try again.");
  }

  // Never fabricate (rule 2): a placeholder, an empty question, or a
  // missing archetype means the generation failed and must surface as an
  // error, not render as a broken or silently-skipped question.
  const gotArchetypes = [...queries.map((q) => q.archetype)].sort();
  if (JSON.stringify(gotArchetypes) !== JSON.stringify([...CUSTOM_QUERY_ARCHETYPES].sort())) {
    throw new Error("Query generation returned unexpected question types — please try again.");
  }

  let seenDiscovery = false;
  return queries.map((q) => {
    const text = (q.text || "").trim();
    if (!text || text.includes("{") || text.includes("}")) {
      throw new Error("Query generation returned an unfilled or empty question — please try again.");
    }
    const isFirstDiscovery = q.archetype === "category-discovery" && !seenDiscovery;
    if (q.archetype === "category-discovery") seenDiscovery = true;
    return {
      qid: assignQid(q.archetype, isFirstDiscovery),
      text,
      archetype: q.archetype,
      language: q.language || "en",
    };
  });
}

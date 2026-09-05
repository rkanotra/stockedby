import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

// Server-only on-demand harvester for chatgpt/gemini, called from
// app/api/test/route.js when the tested category+market has no snapshot
// newer than lib/freshness.js's SNAPSHOT_MAX_AGE_DAYS. Same HARVEST_PROMPT
// and "trust real telemetry over the model's self-report" principle as
// scripts/harvest.py (the offline batch harvester data/*.json is seeded
// from) — kept in sync by hand since one is Python and one is JS. Requires
// GEMINI_API_KEY / OPENAI_API_KEY in Vercel env vars (hard rule 1: server-
// side only, never in client code); if either is unset, that engine's
// harvest*() throws and the caller falls back to whatever snapshot already
// exists (or "data coming soon") rather than failing the whole test.
const GEMINI_MODEL = "gemini-3.6-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";
// Exported for lib/observations.js's observation-provenance logging (Phase
// 1.5 hardening) — the model actually used for an on-demand harvest call,
// keyed the same way HARVEST_ENGINES is. Never used to label a pre-existing
// "snapshot" row (scripts/harvest.py's own offline batch runs, or a bank
// file's inline seed) — those may have been captured with a different
// model version at a different time, which this app has no reliable way to
// know, so lib/observations.js leaves model_name null there rather than
// assuming today's constant applied historically.
export const HARVEST_MODELS = { gemini: GEMINI_MODEL, chatgpt: OPENAI_MODEL };

// /api/test's maxDuration is 65s (it no longer makes the live per-question
// Claude calls itself — see route.js's own comment and app/api/test/query)
// — same reasoning as lib/claudeClient.js's Claude timeout: keep each call
// well under that and disable SDK retries, so a slow/stuck call fails on
// its own instead of eating the whole request's budget (a default-retried
// timeout can silently run 2-3x this). Harvest jobs don't get the query-
// retry treatment — their own "runs at most once" cost guard is
// intentional and stays as-is.
const TIMEOUT_MS = 40_000;

const HARVEST_PROMPT = (queryText) => `I'm going to ask you a shopping question. Answer it the way you normally would
for a real customer — search the web if you can — then convert YOUR OWN answer
into the JSON format below.

My question: "${queryText}"

After deciding your genuine recommendations, output ONLY this JSON, nothing else:

{
  "recommendations": [
    { "rank": 1, "brand": "", "product": "", "why": "one line on why you picked it", "destination": "brand-direct | marketplace | aggregator | none", "destination_domain": "the exact site you would send me to buy this" },
    { "rank": 2, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" },
    { "rank": 3, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" },
    { "rank": 4, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" },
    { "rank": 5, "brand": "", "product": "", "why": "", "destination": "", "destination_domain": "" }
  ],
  "sources_cited": ["list the domains you actually used, if any"]
}

Important: your recommendations must be your real answer to the question — do
not change them because of the format. Name actual brands.`;

function extractJSON(text) {
  const start = (text || "").indexOf("{");
  const end = (text || "").lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error(`No JSON object in reply: ${(text || "").slice(0, 200)}`);
  return JSON.parse(text.slice(start, end + 1));
}

const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

let _gemini = null;
function geminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  if (!_gemini) {
    // retryOptions.attempts: 1 = no retries (matches maxRetries: 0 below).
    _gemini = new GoogleGenAI({ apiKey, httpOptions: { timeout: TIMEOUT_MS, retryOptions: { attempts: 1 } } });
  }
  return _gemini;
}

let _openai = null;
function openaiClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set.");
  if (!_openai) _openai = new OpenAI({ apiKey });
  return _openai;
}

// Real grounding telemetry over the model's self-reported sources_cited —
// same principle as lib/claudeClient.js and scripts/harvest.py.
function realGeminiSources(resp) {
  const chunks = resp.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const domains = chunks.map((c) => c.web?.uri && domainOf(c.web.uri)).filter(Boolean);
  return domains.length ? domains : null;
}

function realOpenAISources(resp) {
  const domains = [];
  for (const item of resp.output || []) {
    if (item.type !== "message") continue;
    for (const block of item.content || []) {
      for (const ann of block.annotations || []) {
        if (ann.type === "url_citation" && ann.url) {
          const d = domainOf(ann.url);
          if (d) domains.push(d);
        }
      }
    }
  }
  return domains.length ? domains : null;
}

export async function harvestGemini(queryText) {
  const resp = await geminiClient().models.generateContent({
    model: GEMINI_MODEL,
    contents: HARVEST_PROMPT(queryText),
    config: { tools: [{ googleSearch: {} }] },
  });
  const parsed = extractJSON(resp.text || "");
  const sources = realGeminiSources(resp) || parsed.sources_cited || [];
  return { recommendations: parsed.recommendations || [], sources };
}

export async function harvestChatGPT(queryText) {
  const resp = await openaiClient().responses.create(
    { model: OPENAI_MODEL, input: HARVEST_PROMPT(queryText), tools: [{ type: "web_search" }] },
    { timeout: TIMEOUT_MS, maxRetries: 0 }
  );
  const parsed = extractJSON(resp.output_text || "");
  const sources = realOpenAISources(resp) || parsed.sources_cited || [];
  return { recommendations: parsed.recommendations || [], sources };
}

export const HARVEST_ENGINES = { gemini: harvestGemini, chatgpt: harvestChatGPT };

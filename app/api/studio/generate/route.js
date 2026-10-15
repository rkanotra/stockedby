import {
  PROTOTYPE_SCHEMA,
  PROTOTYPE_PROMPT,
  validatePrototype,
  prototypeArtifact,
} from "@/lib/studio/prototype";
import OpenAI from "openai";
import { sameOriginRequest } from "@/lib/auth/requestOrigin";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";
import {
  OUTPUT_SCHEMA,
  validateInput,
  systemPrompt,
  groundOutput,
} from "@/lib/studio/generation";
export const runtime = "nodejs";
export const maxDuration = 65;
const response = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  return response({ configured: !!process.env.OPENAI_API_KEY });
}
export async function POST(request) {
  if (!sameOriginRequest(request))
    return response(
      { error: "Open the workspace on StockedBy to run AI." },
      403,
    );
  if (!process.env.OPENAI_API_KEY)
    return response(
      {
        error:
          "AI is not configured on this deployment. Your local work is saved; please try again later.",
      },
      503,
    );
  let input;
  try {
    if (Number(request.headers.get("content-length")) > 200000)
      throw new Error("Request is too large.");
    const raw = await request.text();
    if (raw.length > 200000) throw new Error("Request is too large.");
    input = validateInput(JSON.parse(raw));
  } catch (e) {
    return response({ error: e.message || "Invalid project input." }, 400);
  }
  if (
    !checkAndConsume(getClientIp(request), { namespace: "studio", limit: 40 })
      .allowed ||
    !checkAndConsume("all", { namespace: "studio-global", limit: 250 }).allowed
  )
    return response(
      {
        error:
          "The pilot AI limit has been reached. Keep editing locally and try again tomorrow.",
      },
      429,
    );
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 55000,
      maxRetries: 0,
    });
    const model =
      process.env.STUDIO_OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";
    const result = await client.responses.create(
      {
        model,
        store: false,
        max_output_tokens: input.type === "prototype" ? 10000 : 6500,
        instructions:
          input.type === "prototype"
            ? PROTOTYPE_PROMPT
            : systemPrompt(input.type),
        input: JSON.stringify(input),
        text: {
          format: {
            type: "json_schema",
            name: "delivery_artifact",
            strict: true,
            schema:
              input.type === "prototype" ? PROTOTYPE_SCHEMA : OUTPUT_SCHEMA,
          },
        },
      },
      { signal: request.signal },
    );
    if (result.status !== "completed" || !result.output_text)
      return response(
        {
          error:
            "AI could not finish this document. Try a smaller brief or fewer sources. Your previous version is intact.",
        },
        502,
      );
    const parsed = JSON.parse(result.output_text);
    const artifact =
      input.type === "prototype"
        ? prototypeArtifact(
            validatePrototype(
              parsed,
              new Set(
                input.upstream
                  .filter((n) => n.type === "requirements")
                  .flatMap((n) => (n.items || []).map((i) => i.id)),
              ),
            ),
            input,
          )
        : groundOutput(parsed, input);
    return response({
      artifact: { ...artifact, model: result.model },
      usage: {
        input: result.usage?.input_tokens,
        output: result.usage?.output_tokens,
      },
    });
  } catch (e) {
    const error =
      e.status === 429
        ? "The AI provider is at its usage limit. Try again later."
        : e.name === "APIConnectionTimeoutError"
          ? "This step took too long. Shorten the context and retry."
          : "AI could not complete this step. Your work is saved locally; please retry.";
    return response({ error }, 502);
  }
}

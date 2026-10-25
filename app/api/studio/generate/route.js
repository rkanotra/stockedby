import { QUERY_PROMPT } from "@/lib/studio/queries";
import { PROTOTYPE_SETTINGS_PROMPT, PROTOTYPE_JOURNEY_PROMPT } from "@/lib/studio/prototype-settings";
import { PLAN_SCHEMA, PLAN_PROMPT, groundPlan } from "@/lib/studio/product-plan";
import {
  PROTOTYPE_SCHEMA,
  PROTOTYPE_PROMPT,
  validatePrototype,
  prototypeArtifact,
} from "@/lib/studio/prototype";
import OpenAI from "openai";
import { sameOriginRequest } from "@/lib/auth/requestOrigin";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";
import { generationFailure } from "@/lib/studio/generation-errors";
import {
  OUTPUT_SCHEMA,
  validateInput,
  systemPrompt,
  groundOutput,
} from "@/lib/studio/generation";
export const runtime = "nodejs";
export const maxDuration = 180;
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
          "AI is not configured on this deployment. Your existing content is unchanged; please try again later.",
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
          "The pilot AI limit has been reached. You can keep editing and try AI again tomorrow.",
      },
      429,
    );
  let stage = "provider";
  const timeoutMs = input.type === "prototype" ? 150000 : 58000;
  const deadline = AbortSignal.timeout(timeoutMs);
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: timeoutMs,
      maxRetries: 0,
    });
    const model =
      process.env.STUDIO_OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4.1";
    const result = await client.responses.create(
      {
        model,
        store: false,
        max_output_tokens: input.type === "prototype" ? 10000 : input.type === "plan" ? 8000 : 6500,
        instructions:
          (input.type === "prototype"
            ? PROTOTYPE_PROMPT + "\n" + PROTOTYPE_SETTINGS_PROMPT + "\n" + PROTOTYPE_JOURNEY_PROMPT
            : input.type === "plan" ? PLAN_PROMPT : systemPrompt(input.type)) + "\n" + QUERY_PROMPT,
        input: JSON.stringify(input),
        text: {
          format: {
            type: "json_schema",
            name: "delivery_artifact",
            strict: true,
            schema:
              input.type === "prototype" ? PROTOTYPE_SCHEMA : input.type === "plan" ? PLAN_SCHEMA : OUTPUT_SCHEMA,
          },
        },
      },
      { signal: AbortSignal.any([request.signal, deadline]) },
    );
    if (result.status !== "completed" || !result.output_text)
      return response(
        {
          error:
            "AI could not finish this document. Try a smaller brief or fewer sources. Your previous version is intact.",
        },
        502,
      );
    stage = "validation";
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
        : input.type === "plan" ? groundPlan(parsed, input.sources) : groundOutput(parsed, input);
    return response({
      artifact: { ...artifact, model: result.model },
      usage: {
        input: result.usage?.input_tokens,
        output: result.usage?.output_tokens,
      },
    });
  } catch (e) {
    const failure = generationFailure(deadline.aborted ? { name: "TimeoutError" } : e, stage), reference = crypto.randomUUID();
    // Operational diagnostics only; never log source text, prompts or keys.
    console.error(JSON.stringify({ event: "studio_generation_failed", reference, type: input.type, stage, code: failure.code, providerStatus: Number(e?.status) || null, errorClass: e?.constructor?.name || "Unknown", deadlineReached: deadline.aborted }));
    return response({ error: failure.message, code: failure.code, reference }, failure.status);
  }
}

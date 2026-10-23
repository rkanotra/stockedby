import { QUERY_PROMPT, queryResolutionInput } from "@/lib/studio/queries";
import { planContext } from "@/lib/studio/product-plan";
import OpenAI from "openai";
import { requireTeamUser, json, failure, readBody, command } from "@/lib/team/server";
import { changeSchema, CHANGE_PROMPT, changeTargets, validateProposal } from "@/lib/team/changes";
import { groundedRule } from "@/lib/studio/model";
export const runtime = "nodejs";
export const maxDuration = 65;
export async function POST(request) {
  try {
    const { db } = await requireTeamUser();
    const body = await readBody(request, 10000);
    if (typeof body.request !== "string" || body.request.trim().length < 10 || body.request.length > 4000) throw Error("Describe the change in 10–4,000 characters.");
    if (!process.env.OPENAI_API_KEY) return json({ error: "AI review is not configured yet." }, 503);
    const { data: project, error } = await db.from("team_projects").select("*").eq("id", body.projectId).eq("workspace_id", body.workspaceId).single();
    if (error || !project) return json({ error: "Initiative not found or access removed." }, 404);
    const input = { changeRequest: body.request, queryResolutions: queryResolutionInput(project.document), productPlan: planContext(project.document), targets: changeTargets(project.document), sources: project.document.sources, confirmedRules: (project.document.rules || []).filter(r => r.approved && groundedRule(r, project.document.sources || [])), decisions: project.document.decisions || [] };
    if (JSON.stringify(input).length > 180000) throw Error("This initiative is too large for one review. Shorten its source material before retrying.");
    const schema = changeSchema(input);
    await command(db, "reserve_ai", { workspaceId: body.workspaceId });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 55000, maxRetries: 0 });
    const response = await client.responses.create({ model: process.env.STUDIO_OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4.1", store: false, max_output_tokens: 8500, instructions: CHANGE_PROMPT + "\n" + QUERY_PROMPT, input: JSON.stringify(input), text: { format: { type: "json_schema", name: "initiative_change_review", strict: true, schema } } }, { signal: request.signal });
    if (response.status !== "completed" || !response.output_text) throw Error("AI could not complete this review. The initiative is unchanged. Try a more focused request.");
    const proposal = validateProposal(JSON.parse(response.output_text), project.document);
    const result = await command(db, "propose", { workspaceId: body.workspaceId, projectId: project.id, version: project.version, request: body.request, proposal });
    return json({ result });
  } catch (error) {
    if (error?.status >= 500) return json({ error: "AI review is temporarily unavailable. Nothing was changed." }, 502);
    return failure(error);
  }
}

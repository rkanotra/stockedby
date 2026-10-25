import { requireTeamUser, json, failure, readBody, command } from "@/lib/team/server";
import { parseProjectFile } from "@/lib/studio/model";
const actions = new Set(["create_workspace", "create_project", "save_project", "delete_project", "invite", "accept_invite", "revoke_invite", "remove_member", "comment", "resolve_comment", "decide"]);
export async function GET(request) {
  try {
    const { db, user } = await requireTeamUser();
    const url = new URL(request.url), workspaceId = url.searchParams.get("workspace");
    const { data: workspaces, error } = await db.from("team_workspaces").select("*").order("created_at");
    if (error) throw error;
    if (!workspaceId) return json({ workspaces, user: { id: user.id, email: user.email } });
    if (!workspaces.some(w => w.id === workspaceId)) return json({ error: "Workspace not found or access removed." }, 404);
    const results = await Promise.all(["team_members", "team_projects", "team_changes", "team_comments", "team_events", "team_invites"].map(table => db.from(table).select(table === "team_invites" ? "id,workspace_id,email,role,expires_at,accepted_at,revoked_at" : "*").eq("workspace_id", workspaceId).order(table === "team_members" ? "joined_at" : "created_at", { ascending: false }).limit(150)));
    for (const r of results) if (r.error) throw r.error;
    const availability = await db.rpc("team_delete_project_available");
    return json({ capabilities: { deleteProjects: !availability.error && availability.data === true }, workspaces, members: results[0].data, projects: results[1].data, changes: results[2].data, comments: results[3].data, events: results[4].data, invites: results[5].data });
  } catch (error) { return failure(error); }
}
export async function POST(request) {
  try {
    const { db } = await requireTeamUser(), { action, ...args } = await readBody(request);
    if (!actions.has(action)) throw Error("Unsupported workspace action.");
    if (["create_project", "save_project"].includes(action)) {
      // Validate a deep copy using the existing portable-project parser. Keep
      // original data: that parser intentionally strips local review metadata.
      parseProjectFile(JSON.stringify({ format: "stockedby-studio", version: 1, project: args.document }));
    }
    if (action === "delete_project") {
      const { data, error } = await db.rpc("team_delete_project", { args });
      if (error) throw error;
      return json({ result: data });
    }
    return json({ result: await command(db, action, args) });
  } catch (error) { return failure(error); }
}

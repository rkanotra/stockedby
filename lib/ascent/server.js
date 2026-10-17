import { requireTeamUser, json, readBody } from "../team/server.js";
export { json, readBody };
export async function requireAscentUser() {
  const { db, user } = await requireTeamUser();
  const { data, error } = await db
    .from("ascent_members")
    .select("enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error)
    throw Object.assign(
      Error("The private studio is awaiting database setup."),
      { status: 503 },
    );
  if (!data?.enabled)
    throw Object.assign(
      Error("This studio is private. Your account does not have access."),
      { status: 403 },
    );
  return { db, user };
}
export { action } from "./database.js";
export const SESSION_FIELDS =
  "id,kind,title,prompt,answer,audience,target_seconds,parent_id,relation,context,rubric_version,status,review,transcript,metrics,notes,usage,mime,bytes,attempts,lease_until,error,created_at,updated_at";
export async function session(db, id) {
  const { data, error } = await db
    .from("ascent_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data)
    throw Object.assign(Error("That session is not available."), {
      status: 404,
    });
  return data;
}
export function publicSession(row) {
  const { lease_token, media_path, user_id, sha256, ...safe } = row;
  void lease_token;
  void media_path;
  void user_id;
  void sha256;
  return safe;
}
export function failure(error) {
  const status = error?.status || 400;
  return json(
    {
      error:
        status >= 500
          ? "The studio could not complete this request. Your saved sessions are unchanged. Please retry."
          : error.message || "Could not complete this request.",
    },
    status,
  );
}

import {
  requireAscentUser,
  json,
  readBody,
  failure,
  action,
  session,
  publicSession,
} from "@/lib/ascent/server";
import { sameOriginRequest } from "@/lib/auth/requestOrigin";
import { isId } from "@/lib/ascent/schema";
export const dynamic = "force-dynamic";
async function context(params) {
  const { id } = await params;
  if (!isId(id))
    throw Object.assign(Error("Session not found."), { status: 404 });
  const { db } = await requireAscentUser();
  return { db, id };
}
export async function GET(request, { params }) {
  try {
    const { db, id } = await context(params),
      row = await session(db, id);
    let mediaUrl = null;
    if (
      row.media_path &&
      row.status !== "uploading" &&
      row.status !== "deleting"
    ) {
      const { data, error } = await db.storage
        .from("ascent-private")
        .createSignedUrl(row.media_path, 300);
      if (!error) mediaUrl = data.signedUrl;
    }
    return json({ session: publicSession(row), mediaUrl });
  } catch (e) {
    return failure(e);
  }
}
export async function PATCH(request, { params }) {
  try {
    const { db, id } = await context(params),
      body = await readBody(request, 30000);
    if (
      !Array.isArray(body.notes) ||
      body.notes.length > 100 ||
      body.notes.some(
        (n) =>
          !isId(n.id) ||
          typeof n.text !== "string" ||
          !n.text.trim() ||
          n.text.length > 1500 ||
          !Number.isFinite(n.seconds) ||
          n.seconds < 0 ||
          n.seconds > 180,
      )
    )
      throw Error(
        "Use a timestamp between 0 and 180 seconds and a short note.",
      );
    return json({
      session: publicSession(
        await action(db, "notes", { id, notes: body.notes }),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request, { params }) {
  try {
    if (!sameOriginRequest(request))
      return json({ error: "Open Ascent to delete a session." }, 403);
    const { db, id } = await context(params),
      row = await action(db, "delete", { id });
    if (row.media_path) {
      const { error } = await db.storage
        .from("ascent-private")
        .remove([row.media_path]);
      if (error)
        throw Object.assign(
          Error("Deletion is incomplete. Retry to remove the private file."),
          { status: 503 },
        );
    }
    await action(db, "purge", { id });
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

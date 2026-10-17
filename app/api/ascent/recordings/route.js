import {
  requireAscentUser,
  json,
  readBody,
  failure,
  action,
  session,
  publicSession,
} from "@/lib/ascent/server";
import { trainingInput, mediaInput, isId } from "@/lib/ascent/schema";
export const runtime = "nodejs";
export async function POST(request) {
  try {
    const { db } = await requireAscentUser();
    const body = await readBody(request, 10000);
    const parent =
      body.parentId && isId(body.parentId)
        ? await session(db, body.parentId)
        : null;
    const input = trainingInput({ ...body, kind: "recording" }, parent),
      media = mediaInput(body);
    const row = await action(db, "create", { ...input, ...media });
    if (row.status !== "uploading")
      return json({ session: publicSession(row), duplicate: true });
    const { data, error } = await db.storage
      .from("ascent-private")
      .createSignedUploadUrl(row.media_path, { upsert: false });
    if (error)
      throw Object.assign(Error("Could not prepare a private upload."), {
        status: 503,
      });
    return json({
      session: publicSession(row),
      upload: { url: data.signedUrl, mime: row.mime },
    });
  } catch (e) {
    return failure(e);
  }
}

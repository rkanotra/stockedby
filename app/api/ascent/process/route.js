import { after } from "next/server";
import {
  requireAscentUser,
  json,
  readBody,
  failure,
  action,
  session,
  publicSession,
} from "@/lib/ascent/server";
import { isId } from "@/lib/ascent/schema";
import { processSession } from "@/lib/ascent/processing";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request) {
  try {
    const { db } = await requireAscentUser();
    const body = await readBody(request, 2000);
    if (!isId(body.id)) throw Error("Choose a saved session.");
    let row = await session(db, body.id);
    if (row.status === "uploading") {
      const { data, error } = await db.storage
        .from("ascent-private")
        .info(row.media_path);
      if (error || !data)
        throw Error(
          "The upload has not completed. Select your file and retry the upload.",
        );
      row = await action(db, "uploaded", { id: row.id });
    }
    const claimed = await action(db, "claim", { id: row.id });
    if (claimed) {
      row = claimed;
      after(() => processSession(db, claimed));
    }
    return json({ session: publicSession(row) }, 202);
  } catch (e) {
    return failure(e);
  }
}

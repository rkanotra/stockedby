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
import { trainingInput, isId } from "@/lib/ascent/schema";
import { processSession } from "@/lib/ascent/processing";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request) {
  try {
    const { db } = await requireAscentUser();
    const body = await readBody(request, 22000);
    if (body.kind === "recording") throw Error("Use the recording upload.");
    const parent =
      body.parentId && isId(body.parentId)
        ? await session(db, body.parentId)
        : null;
    const input = trainingInput(body, parent);
    let row = await action(db, "create", input);
    if (row.status === "queued") {
      const claimed = await action(db, "claim", { id: row.id });
      if (claimed) {
        row = claimed;
        after(() => processSession(db, claimed));
      }
    }
    return json({ session: publicSession(row) }, 202);
  } catch (e) {
    return failure(e);
  }
}

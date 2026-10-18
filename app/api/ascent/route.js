import {
  requireAscentUser,
  json,
  readBody,
  failure,
  action,
  SESSION_FIELDS,
} from "@/lib/ascent/server";
export const dynamic = "force-dynamic";
export async function GET(request) {
  try {
    const { db, user } = await requireAscentUser();
    const url = new URL(request.url);
    const offset = Math.max(
      0,
      Math.min(1000, Number(url.searchParams.get("offset")) || 0),
    );
    const results = await Promise.all([
      db
        .from("ascent_sessions")
        .select(SESSION_FIELDS)
        .order("created_at", { ascending: false })
        .range(offset, offset + 49),
      db.from("ascent_settings").select("*").maybeSingle(),
      db
        .from("ascent_checkins")
        .select("day,habits,reflection")
        .order("day", { ascending: false })
        .limit(366),
      db
        .from("ascent_sessions")
        .select(
          "id,kind,status,created_at,overall_score:review->overallScore,parent_id,relation,rubric_version,context",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
    ]);
    const error = results.find((r) => r.error)?.error;
    if (error)
      throw Object.assign(Error("Could not load the private library."), {
        status: 503,
      });
    return json({
      email: user.email,
      sessions: results[0].data,
      settings: results[1].data,
      checkins: results[2].data,
      progress: results[3].data,
      nextOffset: results[0].data.length === 50 ? offset + 50 : null,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request) {
  try {
    const { db } = await requireAscentUser();
    const body = await readBody(request, 30000);
    if (body.action === "settings") {
      if (
        !Array.isArray(body.roadmap) ||
        body.roadmap.length > 20 ||
        body.roadmap.some(
          (m) =>
            !m.id ||
            typeof m.title !== "string" ||
            m.title.length > 150 ||
            typeof m.detail !== "string" ||
            m.detail.length > 1000 ||
            typeof m.done !== "boolean" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(m.date),
        )
      )
        throw Error("Check the milestone titles and dates.");
      return json({
        settings: await action(db, "settings", {
          roadmap: body.roadmap,
          version: body.version,
        }),
      });
    }
    if (body.action === "checkin") {
      if (
        !Array.isArray(body.habits) ||
        body.habits.some((x) => !Number.isInteger(x) || x < 0 || x > 5) ||
        typeof body.reflection !== "string" ||
        body.reflection.length > 6000
      )
        throw Error("Check the reflection and habits.");
      await action(db, "checkin", body);
      return json({ ok: true });
    }
    if (body.action === "delete_checkin") {
      await action(db, "delete_checkin", { day: body.day });
      return json({ ok: true });
    }
    throw Error("Unknown studio action.");
  } catch (e) {
    return failure(e);
  }
}

import {
  SCENARIOS,
  INTERVIEWS,
  STORY_FORMATS,
  RUBRIC_VERSION,
  MAX_MEDIA_BYTES,
} from "./catalog.js";
const string = { type: "string" };
const strings = { type: "array", items: string };
const score = { type: ["number", "null"] };
export const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "overallScore",
    "dimensions",
    "strengths",
    "priorities",
    "improvedResponse",
    "followUpChallenge",
    "coachingNote",
    "limitations",
    "publication",
  ],
  properties: {
    overallScore: score,
    dimensions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "score", "evidence", "nextAction"],
        properties: {
          key: string,
          score,
          evidence: string,
          nextAction: string,
        },
      },
    },
    strengths: strings,
    priorities: strings,
    improvedResponse: string,
    followUpChallenge: string,
    coachingNote: string,
    limitations: strings,
    publication: {
      type: "object",
      additionalProperties: false,
      required: ["title", "summary", "caption"],
      properties: { title: string, summary: string, caption: string },
    },
  },
};
export function validateReview(value) {
  const checkScore = (x) =>
    x === null ||
    (Number.isFinite(x) && x >= 0 && x <= 10 && Number.isInteger(x));
  if (
    !value ||
    !checkScore(value.overallScore) ||
    !Array.isArray(value.dimensions) ||
    value.dimensions.length < 4 ||
    value.dimensions.length > 6
  )
    throw Error("Review format was incomplete. Retry this session.");
  for (const d of value.dimensions)
    if (
      !checkScore(d.score) ||
      !["key", "evidence", "nextAction"].every(
        (k) => typeof d[k] === "string" && d[k].trim() && d[k].length <= 2000,
      )
    )
      throw Error("Review dimensions could not be validated.");
  for (const key of ["strengths", "priorities", "limitations"])
    if (
      !Array.isArray(value[key]) ||
      value[key].length > 12 ||
      value[key].some((x) => typeof x !== "string" || x.length > 2000)
    )
      throw Error("Review notes could not be validated.");
  for (const key of ["improvedResponse", "followUpChallenge", "coachingNote"])
    if (
      typeof value[key] !== "string" ||
      !value[key].trim() ||
      value[key].length > 12000
    )
      throw Error("Review response could not be validated.");
  if (
    !value.publication ||
    !["title", "summary", "caption"].every(
      (k) =>
        typeof value.publication[k] === "string" &&
        value.publication[k].length <= 2000,
    )
  )
    throw Error("Review export could not be validated.");
  return {
    ...value,
    assessedModalities: ["text"],
    rubricVersion: RUBRIC_VERSION,
    limitations: [
      ...new Set([
        ...value.limitations,
        "This review assesses words and argument structure. Audible tone, vocal pauses, emotion, confidence, body language and eye contact were not assessed.",
      ]),
    ],
  };
}
export const isId = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
const text = (value, max) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export function trainingInput(body, parent = null) {
  if (!isId(body.id)) throw Error("Start a new session and try again.");
  const kind = body.kind;
  if (
    !["scenario", "story", "interview", "reflection", "recording"].includes(
      kind,
    )
  )
    throw Error("Choose a training mode.");
  const answer = text(body.answer, 12000),
    audience = text(body.audience, 120) || "MD / board";
  if (kind !== "recording" && answer.length < 30)
    throw Error(
      "Write at least 30 characters so the coach has evidence to review.",
    );
  if (typeof body.answer === "string" && body.answer.length > 12000)
    throw Error("Keep the response within 12,000 characters.");
  let title,
    prompt,
    seconds = Number(body.targetSeconds) || 90;
  if (![45, 60, 90, 180].includes(seconds))
    throw Error("Choose a 45, 60, 90 or 180-second target.");
  if (kind === "scenario" || kind === "interview") {
    const scenario = (kind === "scenario" ? SCENARIOS : INTERVIEWS).find(
      (x) => x.id === body.scenarioId,
    );
    if (!scenario) throw Error("Choose a scenario from the library.");
    title = scenario.title;
    prompt = scenario.prompt;
  } else if (kind === "story") {
    const format =
      STORY_FORMATS.find((x) => x.id === body.formatId) || STORY_FORMATS[0];
    title = `${format.title}: ${text(body.topic, 120) || "My leadership story"}`;
    seconds = format.seconds;
    prompt = `Develop a ${seconds}-second ${format.title.toLowerCase()} for ${audience}. Topic: ${text(body.topic, 500)}. Use Hook → Business problem → Tension/trade-off → Action → Outcome/measure → Takeaway. Label expected impact; never invent outcomes.`;
  } else if (kind === "recording") {
    title = text(body.title, 160) || "My next take";
    prompt = `A ${seconds}-second spoken insight for ${audience}. Topic: ${text(body.topic, 500) || title}. Coach the transcript as a script, with specific improvements and a next-take challenge.`;
  } else {
    title = "Evening reflection";
    prompt =
      "Read the reflection about daily practice. Offer one practical next-day drill without shaming, moral judgements or streak pressure. Only score the clarity of the reflection when there is sufficient evidence; never score personal worth or mental health.";
  }
  let relation = null;
  if (parent) {
    if (parent.kind !== kind || parent.status !== "ready")
      throw Error("Choose a completed session in the same training mode.");
    relation = ["revision", "followup", "take"].includes(body.relation)
      ? body.relation
      : "revision";
    title = parent.title;
    prompt =
      relation === "followup"
        ? parent.review?.followUpChallenge
        : parent.prompt;
    if (!prompt) throw Error("That session has no follow-up yet.");
  }
  return {
    id: body.id,
    kind,
    title,
    prompt,
    answer,
    audience,
    target_seconds: seconds,
    parent_id: parent?.id || null,
    relation,
    context: {
      scenarioId: body.scenarioId || null,
      formatId: body.formatId || null,
      topic: text(body.topic, 500),
      replyMode: body.replyMode === "verbal" ? "verbal" : "email",
    },
    rubric_version: RUBRIC_VERSION,
  };
}
export function mediaInput(body) {
  const extension = text(body.filename, 200).split(".").pop().toLowerCase();
  const types = {
    mov: "video/quicktime",
    mp4: "video/mp4",
    m4a: "audio/mp4",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    webm: "video/webm",
  };
  if (!types[extension]) throw Error("Choose MOV, MP4, M4A, WAV, MP3 or WebM.");
  if (
    !Number.isInteger(body.bytes) ||
    body.bytes < 32 ||
    body.bytes > MAX_MEDIA_BYTES
  )
    throw Error("Choose a recording up to 50 MB.");
  if (!/^[a-f0-9]{64}$/.test(body.sha256 || ""))
    throw Error("The file fingerprint is missing. Select the file again.");
  return {
    extension,
    mime: types[extension],
    bytes: body.bytes,
    sha256: body.sha256,
  };
}
export function validMediaSignature(bytes, extension) {
  if (bytes.length < 12) return false;
  if (["mov", "mp4", "m4a"].includes(extension))
    return ["ftyp", "moov", "mdat", "wide", "free"].includes(
      bytes.toString("ascii", 4, 8),
    );
  if (extension === "wav")
    return (
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WAVE"
    );
  if (extension === "mp3")
    return (
      bytes.toString("ascii", 0, 3) === "ID3" ||
      (bytes[0] === 255 && (bytes[1] & 224) === 224)
    );
  return (
    extension === "webm" &&
    bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  );
}
export function transcriptMetrics(text, duration = null) {
  const words = text.trim().split(/\s+/).filter(Boolean),
    fillers = text.match(/\b(um|uh|erm|you know|i mean)\b/gi) || [];
  const counts = new Map();
  for (const word of words) {
    const clean = word.toLowerCase().replace(/[^a-z]/g, "");
    if (clean.length > 3) counts.set(clean, (counts.get(clean) || 0) + 1);
  }
  return {
    wordCount: words.length,
    durationSeconds: duration,
    approxWordsPerMinute:
      duration > 0 ? Math.round((words.length / duration) * 60) : null,
    estimatedScriptSeconds: Math.round((words.length / 130) * 60),
    fillerCount: fillers.length,
    repeatedWords: [...counts]
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word, count]) => ({ word, count })),
    note: "Rate uses total recording duration, including silence. Transcription may omit fillers; repeated words are descriptive, not a delivery score.",
  };
}

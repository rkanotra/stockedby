import { mkdtemp, rm } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import OpenAI from "openai";
import { action } from "./database.js";
import { reviewAnswer } from "./ai.js";
import { transcriptMetrics } from "./schema.js";
import { MAX_MEDIA_BYTES } from "./catalog.js";
import { extractAudio } from "./media.js";
export async function processSession(db, claimed) {
  let directory;
  const id = claimed.id,
    token = claimed.lease_token;
  const update = (status, extra = {}) =>
    action(db, "job", { id, token, status, ...extra });
  const started = Date.now();
  try {
    let answer = claimed.answer,
      transcript = claimed.transcript,
      metrics;
    if (claimed.kind === "recording") {
      if (transcript?.text) {
        answer = transcript.text;
        metrics = transcriptMetrics(answer, transcript.duration);
      } else {
        const { data: blob, error } = await db.storage
          .from("ascent-private")
          .download(claimed.media_path);
        if (error || !blob)
          throw Error("The upload is not available. Retry uploading the file.");
        if (blob.size !== claimed.bytes || blob.size > MAX_MEDIA_BYTES)
          throw Error(
            "The uploaded size does not match. Remove this session and upload the recording again.",
          );
        const bytes = Buffer.from(await blob.arrayBuffer());
        if (createHash("sha256").update(bytes).digest("hex") !== claimed.sha256)
          throw Error(
            "The file fingerprint does not match. Remove this session and upload again.",
          );
        directory = await mkdtemp(path.join(tmpdir(), "ascent-"));
        const { output, duration } = await extractAudio(
          bytes,
          claimed.media_path.split(".").pop(),
          directory,
        );
        if (!(await update("transcribing"))) return;
        const client = new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
          timeout: 65000,
          maxRetries: 0,
        });
        const transcriptionModel = process.env.ASCENT_TRANSCRIPTION_MODEL || "gpt-transcribe";
        const raw = await client.audio.transcriptions.create({
          file: createReadStream(output),
          model: transcriptionModel,
          ...(transcriptionModel === "whisper-1" ? { response_format: "verbose_json", timestamp_granularities: ["segment"] } : { response_format: "json" }),
        });
        answer = raw.text?.trim() || "";
        if (answer.length < 30)
          throw Error(
            "There was too little clear speech to coach. Try a new take in a quieter space.",
          );
        if (answer.length > 12000)
          throw Error(
            "The transcript exceeded the training limit. Use a shorter take.",
          );
        transcript = {
          text: answer,
          duration,
          segments: (raw.segments || [])
            .filter((s) => s.start >= 0 && s.end <= duration + 1)
            .map((s) => ({ start: s.start, end: s.end, text: s.text }))
            .slice(0, 300),
          model: transcriptionModel,
        };
        metrics = transcriptMetrics(answer, duration);
      }
    }
    if (!(await update("reviewing", transcript ? { transcript, metrics } : {})))
      return;
    const remaining = Math.max(1000, 250000 - (Date.now() - started));
    const result = await reviewAnswer(
      claimed,
      answer,
      AbortSignal.timeout(Math.min(70000, remaining)),
    );
    await update("ready", {
      ...result,
      metrics: metrics || result.metrics,
      usage: {
        ...result.usage,
        transcriptionSeconds: transcript?.duration || 0,
        processingMs: Date.now() - started,
      },
    });
  } catch (error) {
    // Never log recordings, transcripts, prompts, user identifiers or provider responses.
    console.error(
      JSON.stringify({
        event: "ascent_processing_failed",
        kind: claimed.kind,
        attempt: claimed.attempts,
        status: Number(error.status) || null,
        errorType: error.name,
        reason: [
          "The AI review was incomplete. Retry the saved session.",
          "Review format was incomplete. Retry this session.",
          "Review dimensions could not be validated.",
          "Review notes could not be validated.",
          "Review response could not be validated.",
          "Review export could not be validated.",
        ].includes(error.message) ? error.message : "provider_or_processing_error",
      }),
    );
    let message =
      "Processing did not finish. Your session is saved. Retry once; if it repeats, use a shorter take or response.";
    if (error.status === 429)
      message =
        "The AI provider usage limit was reached. Your session is saved. Retry later.";
    else if (error.status === 401 || error.status === 403)
      message =
        "The AI service needs an owner configuration check. Your session is saved.";
    else if (
      /longer than|too little|format is invalid|fingerprint|size does not match|one second|not available|not configured|exceeded the training/.test(
        error.message || "",
      )
    )
      message = error.message;
    try {
      await update("failed", { error: message });
    } catch {
      console.error(
        JSON.stringify({ event: "ascent_failure_status_not_saved" }),
      );
    }
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

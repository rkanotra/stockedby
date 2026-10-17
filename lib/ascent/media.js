import { writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffmpegPath from "ffmpeg-static";
import { validMediaSignature } from "./schema.js";
import { MAX_MEDIA_BYTES, MAX_MEDIA_SECONDS } from "./catalog.js";
const execute = promisify(execFile);
export function wavDuration(buffer) {
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  )
    throw Error("Audio extraction was incomplete.");
  let rate = 0,
    data = 0;
  for (let p = 12; p + 8 <= buffer.length; ) {
    const kind = buffer.toString("ascii", p, p + 4),
      size = buffer.readUInt32LE(p + 4);
    if (kind === "fmt " && size >= 16) rate = buffer.readUInt32LE(p + 16);
    if (kind === "data") {
      data = Math.min(size, buffer.length - p - 8);
      break;
    }
    p += 8 + size + (size % 2);
  }
  if (!rate || !data) throw Error("No readable audio was found.");
  return data / rate;
}
export async function extractAudio(bytes, extension, directory) {
  if (bytes.length > MAX_MEDIA_BYTES || !validMediaSignature(bytes, extension))
    throw Error(
      "The recording format is invalid. Export a fresh MOV, MP4, M4A, WAV, MP3 or WebM file.",
    );
  const input = path.join(directory, `input.${extension}`),
    output = path.join(directory, "speech.wav");
  await writeFile(input, bytes);
  await execute(
    ffmpegPath,
    [
      "-nostdin",
      "-hide_banner",
      "-loglevel",
      "error",
      "-protocol_whitelist",
      "file,pipe",
      "-threads",
      "1",
      "-f",
      ({mov:"mov",mp4:"mov",m4a:"mov",wav:"wav",mp3:"mp3",webm:"matroska"})[extension],
      "-i",
      input,
      "-map",
      "0:a:0",
      "-vn",
      "-t",
      String(MAX_MEDIA_SECONDS + 1),
      "-ac",
      "1",
      "-ar",
      "16000",
      "-c:a",
      "pcm_s16le",
      "-threads",
      "1",
      "-y",
      output,
    ],
    { timeout: 80000, maxBuffer: 100000, windowsHide: true },
  );
  const wav = await readFile(output),
    duration = wavDuration(wav);
  if (duration > MAX_MEDIA_SECONDS + 0.1)
    throw Error(
      "This take is longer than three minutes. Trim it on your iPhone and upload again.",
    );
  if (duration < 1)
    throw Error("Record at least one second of audible speech.");
  return { output, duration };
}

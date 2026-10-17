import { sameOriginRequest } from "@/lib/auth/requestOrigin";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";
import OpenAI from "openai";
import { imageMime, imageExtractionRequest, imageExtractionText } from "@/lib/studio/image-input";
export const runtime = "nodejs";
export const maxDuration = 65;
export async function POST(request) {
  const json = (data, status = 200) =>
    Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
  if (!sameOriginRequest(request))
    return json({ error: "Upload from the StockedBy workspace." }, 403);
  if (Number(request.headers.get("content-length")) > 4000000)
    return json({ error: "Use a file smaller than 3 MB." }, 413);
  if (
    !checkAndConsume(getClientIp(request), {
      namespace: "studio-files",
      limit: 60,
    }).allowed
  )
    return json(
      { error: "Upload limit reached. Paste a short excerpt instead." },
      429,
    );
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!file || typeof file.arrayBuffer !== "function" || file.size > 3000000)
      return json({ error: "Choose a file under 3 MB." }, 400);
    const ext = file.name.toLowerCase().split(".").pop();
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    if (["txt", "md", "csv", "json"].includes(ext))
      text = buffer.toString("utf8");
    else if (ext === "docx") {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (ext === "pdf") {
      const { extractText, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(new Uint8Array(buffer), {
        isEvalSupported: false,
      });
      try {
        if (pdf.numPages > 60)
          return json(
            {
              error:
                "Use a PDF of up to 60 pages. Upload the relevant section.",
            },
            413,
          );
        text = (await extractText(pdf, { mergePages: true })).text;
      } finally {
        await pdf.loadingTask.destroy();
      }
    } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
      try { imageMime(buffer, ext); } catch (error) {
        return json({ error: error.message }, 422);
      }
      if (!process.env.OPENAI_API_KEY)
        return json({ error: "Image reading is unavailable. Paste a description or upload a text document instead." }, 503);
      if (!checkAndConsume(getClientIp(request), { namespace: "studio-image", limit: 20 }).allowed ||
          !checkAndConsume("all", { namespace: "studio-image-global", limit: 100 }).allowed)
        return json({ error: "The image-reading limit has been reached. Paste notes or use a text document instead." }, 429);
      try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 55000, maxRetries: 0 });
        const result = await client.responses.create(imageExtractionRequest(buffer, ext,
          process.env.STUDIO_OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4.1"), { signal: request.signal });
        text = imageExtractionText(result);
      } catch {
        return json({ error: "Could not finish reading this image. Try a clearer image or paste its contents. No project content was changed." }, 502);
      }
    } else
      return json(
        { error: "Choose PDF, DOCX, TXT, Markdown, CSV, JSON, PNG, JPEG or WebP." },
        400,
      );
    if (text.trim().length < 20)
      return json(
        {
          error:
            "No readable text found. For a scanned PDF, paste its text or upload a text-based document.",
        },
        422,
      );
    if (text.length > 40000)
      return json(
        {
          error:
            "This document exceeds 40,000 characters. Upload a relevant section instead.",
        },
        413,
      );
    return json({ text: text.trim(), name: file.name.slice(0, 150), image: ["png", "jpg", "jpeg", "webp"].includes(ext) });
  } catch {
    return json(
      {
        error:
          "Could not read that file. Try a text-based PDF, DOCX or paste the content.",
      },
      422,
    );
  }
}

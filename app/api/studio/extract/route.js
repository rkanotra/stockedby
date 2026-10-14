import { sameOriginRequest } from "@/lib/auth/requestOrigin";
import { getClientIp, checkAndConsume } from "@/lib/rateLimit";
export const runtime = "nodejs";
export const maxDuration = 30;
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
    } else
      return json(
        { error: "Choose PDF, DOCX, TXT, Markdown, CSV or JSON." },
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
    return json({ text: text.trim(), name: file.name.slice(0, 150) });
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

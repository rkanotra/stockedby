import { projectMarkdown, csv } from "./model";
export function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export async function exportProject(p, format) {
  const name =
    p.name
      .replace(/[^a-z0-9 -]/gi, "")
      .trim()
      .slice(0, 60) || "StockedBy project";
  if (format === "json")
    return download(
      new Blob(
        [
          JSON.stringify(
            { format: "stockedby-studio", version: 1, project: p },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      `${name}.json`,
    );
  if (format === "csv")
    return download(
      new Blob(["\uFEFF" + csv(p)], { type: "text/csv;charset=utf-8" }),
      `${name}.csv`,
    );
  const markdown = projectMarkdown(p);
  if (format === "md")
    return download(
      new Blob([markdown], { type: "text/markdown" }),
      `${name}.md`,
    );
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } =
    await import("docx");
  const children = markdown.split("\n").map((line) => {
    const h = line.match(/^(#{1,3}) (.+)$/);
    return new Paragraph({
      ...(h
        ? {
            heading: [
              HeadingLevel.HEADING_1,
              HeadingLevel.HEADING_2,
              HeadingLevel.HEADING_3,
            ][h[1].length - 1],
          }
        : {}),
      ...(line.startsWith("- ") ? { bullet: { level: 0 } } : {}),
      children: [
        new TextRun({
          text: (h ? h[2] : line.replace(/^- /, "")).replace(/\*\*/g, ""),
          font: "Calibri",
          size: h ? undefined : 22,
        }),
      ],
      spacing: { after: 120 },
    });
  });
  const doc = new Document({
    creator: "StockedBy",
    title: p.name,
    description: "Product delivery package. AI drafts require human review.",
    sections: [{ properties: {}, children }],
  });
  download(await Packer.toBlob(doc), `${name}.docx`);
}

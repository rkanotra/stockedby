import mammoth from "mammoth";
import { DOMParser } from "@xmldom/xmldom";

// Mammoth's plain-text export flattens table cells into paragraphs. Preserve
// explicit column positions and blanks so intake answers cannot shift labels.
export async function extractWordDocument(buffer) {
  const { value } = await mammoth.convertToHtml({ buffer }, {
    includeDefaultStyleMap: true,
    convertImage: mammoth.images.imgElement(async () => ({ src: "", alt: "Embedded image: upload separately for AI reading" })),
  });
  const doc = new DOMParser().parseFromString(`<div>${value}</div>`, "text/html");
  let tableCount = 0;
  function render(node) {
    if (node.nodeType === 3) return node.nodeValue;
    if (node.nodeType !== 1 && node.nodeType !== 9) return "";
    const tag = node.nodeName.toLowerCase();
    if (tag === "img") return "[Embedded image: upload separately for AI reading]";
    if (tag === "br") return "\n";
    if (tag === "table") {
      const tableId = ++tableCount;
      const rows = [];
      function collect(parent) {
        for (const child of Array.from(parent.childNodes || [])) {
          if (child.nodeName === "tr") rows.push(child);
          else if (["thead", "tbody", "tfoot"].includes(child.nodeName)) collect(child);
        }
      }
      collect(node);
      const occupied = new Map();
      return `\nTable ${tableId} (blank cells mean not provided):\n` + rows.map((row, index) => {
        let column = 0;
        const values = [];
        function skipMerged() {
          while (occupied.get(column + 1) > index) values.push(`C${++column}: "[Merged with cell above]"`);
        }
        Array.from(row.childNodes).filter(cell => ["td", "th"].includes(cell.nodeName)).forEach(cell => {
          skipMerged();
          const text = Array.from(cell.childNodes).map(render).join("").trim();
          const span = Math.min(100, Math.max(1, Number(cell.getAttribute("colspan")) || 1));
          const height = Math.min(1000, Math.max(1, Number(cell.getAttribute("rowspan")) || 1));
          for (let i = 0; i < span; i++) {
            values.push(`C${++column}: ${JSON.stringify(i ? "[Merged with preceding cell]" : text || "[Not provided]")}`);
            if (height > 1) occupied.set(column, index + height);
          }
        });
        skipMerged();
        return `Row ${index + 1}: ` + values.join(" | ");
      }).join("\n") + "\n\n";
    }
    const text = Array.from(node.childNodes || []).map(render).join("");
    if (tag === "a") {
      const href = node.getAttribute("href");
      return /^https?:\/\//i.test(href) && href !== text ? `${text} (${href})` : text;
    }
    return /^(p|h[1-6]|li)$/.test(tag) ? `${text}\n\n` : text;
  }
  return render(doc).trim();
}

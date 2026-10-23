import ExcelJS from "exceljs";
import unzipper from "unzipper";

const TOO_LARGE = "This workbook is too large to read. Save the relevant sheets in a smaller XLSX file (up to 40,000 extracted characters).";
const MAX_EXPANDED_BYTES = 20_000_000;

function cellText(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  if (value.richText) return value.richText.map(part => part.text).join("");
  if (value.formula || value.sharedFormula) {
    const result = value.result == null ? "result unavailable; recalculate and save in Excel" : `saved result: ${cellText(value.result)}`;
    return `=${value.formula || `[shared formula ${value.sharedFormula}]`} (${result})`;
  }
  return value.text || value.error || "";
}

export async function extractSpreadsheet(buffer) {
  // Bound the expanded archive before asking the workbook parser to allocate it.
  const archive = await unzipper.Open.buffer(buffer);
  if (!archive.files.some(file => file.path === "xl/workbook.xml"))
    throw Error("Choose a valid .xlsx workbook. Resave older or password-protected files as XLSX in Excel first.");
  if (archive.files.length > 1000 || archive.files.reduce((sum, file) => sum + file.uncompressedSize, 0) > MAX_EXPANDED_BYTES)
    throw Error(TOO_LARGE);
  let expanded = 0;
  for (const file of archive.files) {
    if (file.type === "Directory") continue;
    // Check actual expansion as well as ZIP metadata; never extract files to disk.
    for await (const chunk of file.stream()) {
      expanded += chunk.length;
      if (expanded > MAX_EXPANDED_BYTES) throw Error(TOO_LARGE);
    }
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer, { ignoreNodes: ["mergeCells", "dataValidations", "conditionalFormatting", "drawing", "picture", "extLst"] });
  if (workbook.worksheets.length > 30) throw Error("Use a workbook with up to 30 sheets. Save the relevant sheets in a separate XLSX file.");
  const lines = [];
  let characters = 0, cells = 0, populated = false, skipped = false;
  const append = line => {
    characters += line.length + 1;
    if (characters > 40000) throw Error(TOO_LARGE);
    lines.push(line);
  };
  append("Excel input: cell values and saved formula results. Formulas are not recalculated. Charts and embedded images are not read.");
  workbook.eachSheet(sheet => {
    if (sheet.state !== "visible") { skipped = true; return; }
    append(`\nWorksheet: ${sheet.name}`);
    sheet.eachRow(row => {
      if (row.hidden) { skipped = true; return; }
      const values = [];
      row.eachCell(cell => {
        if (sheet.getColumn(cell.col).hidden) { skipped = true; return; }
        if (++cells > 10000) throw Error(TOO_LARGE);
        const value = cellText(cell.value).trim();
        if (!value) return;
        populated = true;
        const format = cell.numFmt && cell.numFmt !== "General" && (typeof cell.value === "number" || cell.type === ExcelJS.ValueType.Formula) ? ` [Excel format: ${cell.numFmt}]` : "";
        values.push(`${cell.address}: ${JSON.stringify(value)}${format}`);
      });
      if (values.length) append(values.join(" | "));
    });
  });
  if (!populated) throw Error("This workbook has no readable values in visible cells. Add text or data, or upload a relevant sheet.");
  if (skipped) append("\nHidden sheets, rows and columns were excluded. Unhide any content you want to include and upload again.");
  return lines.join("\n");
}

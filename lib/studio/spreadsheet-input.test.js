import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { extractSpreadsheet } from "./spreadsheet-input.js";

async function workbookBuffer(fill) {
  const book = new ExcelJS.Workbook();
  fill(book);
  return Buffer.from(await book.xlsx.writeBuffer());
}
test("XLSX extraction preserves sheet names, cell references, rich text, dates and formula provenance", async () => {
  const buffer = await workbookBuffer(book => {
    const sheet = book.addWorksheet("Requirements");
    sheet.addRow(["ID", "Description", "Target"]);
    sheet.addRow(["REQ-1", { richText: [{ text: "Save " }, { text: "application" }] }, 0]);
    sheet.getCell("C3").value = { formula: "1+1", result: 2 };
    sheet.getCell("C4").value = { formula: "1+2" };
    sheet.getCell("D2").value = false;
    sheet.getCell("E2").value = new Date("2026-10-23T00:00:00Z");
    const metrics = book.addWorksheet("Metrics");
    metrics.getCell("B3").value = 0.15;
    metrics.getCell("B3").numFmt = "0%";
  });
  const text = await extractSpreadsheet(buffer);
  for (const value of ["Worksheet: Requirements", "Worksheet: Metrics", 'A2: "REQ-1"', "Save application", 'C2: "0"', 'D2: "false"', "2026-10-23", "saved result: 2", "result unavailable", "Excel format: 0%"])
    assert.ok(text.includes(value), value);
});
test("hidden content is omitted with a visible explanation", async () => {
  const text = await extractSpreadsheet(await workbookBuffer(book => {
    const sheet = book.addWorksheet("Public");
    sheet.getCell("A1").value = "Requirement";
    sheet.getCell("B1").value = "hidden-column"; sheet.getColumn(2).hidden = true;
    sheet.getCell("A2").value = "hidden-row"; sheet.getRow(2).hidden = true;
    book.addWorksheet("Private", { state: "hidden" }).getCell("A1").value = "hidden-sheet";
  }));
  assert.ok(text.includes("Requirement"));
  assert.ok(text.includes("Hidden sheets, rows and columns were excluded"));
  assert.doesNotMatch(text, /hidden-column|hidden-row|hidden-sheet/);
});
test("rejects unreadable, empty and over-limit workbooks instead of silently truncating", async () => {
  await assert.rejects(extractSpreadsheet(Buffer.from("not a workbook")));
  await assert.rejects(extractSpreadsheet(await workbookBuffer(book => book.addWorksheet("Empty"))), /no readable values/);
  await assert.rejects(extractSpreadsheet(await workbookBuffer(book => { const sheet = book.addWorksheet("Long"); sheet.addRow(["a".repeat(25000), "b".repeat(25000)]); })), /too large/);
});

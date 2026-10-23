import test from "node:test";
import assert from "node:assert/strict";
import { Document, Packer, Paragraph, Table, TableRow, TableCell } from "docx";
import { extractWordDocument } from "./document-input.js";

test("Word intake tables retain blank answers and column identity", async () => {
  const row = values => new TableRow({ children: values.map(text => new TableCell({ children: [new Paragraph(text)] })) });
  const buffer = await Packer.toBuffer(new Document({ sections: [{ children: [
    new Paragraph("Project intake"),
    new Table({ rows: [row(["Requirement", "Owner", "Due date"]), row(["Save applications", "", "Friday"]), row(["e.g. Send a reminder", "Sample owner", "TBC"])] }),
    new Paragraph("Scope remains under review."),
  ] }] }));
  const text = await extractWordDocument(buffer);
  assert.ok(text.includes('C1: "Save applications" | C2: "[Not provided]" | C3: "Friday"'));
  assert.ok(text.includes('C1: "Requirement" | C2: "Owner" | C3: "Due date"'));
  assert.ok(text.includes("e.g. Send a reminder"));
  assert.ok(text.includes("Scope remains under review."));
  assert.doesNotMatch(text, /<table|<td/);
});

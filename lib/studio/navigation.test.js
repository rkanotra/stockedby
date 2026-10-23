import test from "node:test";
import assert from "node:assert/strict";
import { initialDocument, documentView } from "./navigation.js";
import { demoProject } from "./demo.js";
import { documentMarkdown } from "./model.js";

test("resume opens the PRD even when other outputs were generated later", () => {
  const project = { nodes: [{ id: "brief", type: "brief", artifact: { generatedAt: "2026-10-23" } }, { id: "prd", type: "requirements", artifact: { generatedAt: "2026-10-22" } }] };
  assert.equal(initialDocument(project).id, "prd");
});
test("resume surfaces an existing brief rather than an empty requirements placeholder", () => {
  const project = { nodes: [{ id: "prd", type: "requirements", artifact: null }, { id: "brief", type: "brief", artifact: {} }] };
  assert.equal(initialDocument(project).id, "brief");
  assert.equal(initialDocument({ nodes: [] }), null);
  assert.equal(documentView({ type: "brief" }), "documents");
  assert.equal(documentView({ type: "prototype" }), "prototype");
});
test("single document export contains its requirements and questions, without the whole package", () => {
  const project = demoProject();
  const node = project.nodes.find(n => n.type === "requirements");
  const text = documentMarkdown(node);
  assert.ok(text.includes(node.artifact.title));
  assert.ok(text.includes(node.artifact.items[0].detail));
  assert.ok(text.includes("## Open questions"));
  assert.ok(!text.includes("## Project context"));
});

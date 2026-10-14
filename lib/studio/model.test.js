import test from "node:test";
import assert from "node:assert/strict";
import {
  newProject,
  updateContext,
  updateArtifact,
  reorder,
  approvalProblems,
  parseProjectFile,
  groundedRule,
  traceRows,
  csv,
} from "./model.js";
import { demoProject } from "./demo.js";
import { validateInput, groundOutput } from "./generation.js";
test("manual edits cannot clear a stale document or overwrite generation time", () => {
  const p = updateContext(demoProject(), { brief: "Changed scope" });
  const n = p.nodes[1];
  const next = updateArtifact(
    p,
    n.id,
    { ...n.artifact, content: "Edited" },
    { manual: true },
  );
  assert.equal(next.nodes[1].artifact.status, "stale");
  assert.equal(next.nodes[1].artifact.generatedAt, n.artifact.generatedAt);
  assert.ok(approvalProblems(next, next.nodes[1]).length);
});
test("context edits invalidate all generated documents and clear local reviews", () => {
  const p = demoProject();
  p.nodes.forEach((n) => {
    n.artifact.status = "approved";
    n.artifact.approval = { by: "Tester" };
  });
  const next = updateContext(p, { brief: "Changed project scope" });
  assert.ok(
    next.nodes.every(
      (n) => n.artifact.status === "stale" && n.artifact.approval === null,
    ),
  );
  assert.equal(p.nodes[0].artifact.status, "approved");
});
test("editing a middle document invalidates only downstream documents", () => {
  const p = demoProject(),
    next = updateArtifact(p, p.nodes[1].id, {
      ...p.nodes[1].artifact,
      content: "New scope",
    });
  assert.equal(next.nodes[0].artifact.status, "draft");
  assert.equal(next.nodes[1].artifact.status, "draft");
  assert.ok(next.nodes.slice(2).every((n) => n.artifact.status === "stale"));
});
test("workflow reorder preserves node content and flags stale outputs", () => {
  const p = demoProject(),
    last = p.nodes.at(-1),
    next = reorder(p, last.id, p.nodes[0].id);
  assert.equal(next.nodes[0].id, last.id);
  assert.equal(next.nodes[0].artifact.title, last.artifact.title);
  assert.equal(next.nodes.length, p.nodes.length);
  assert.ok(next.nodes.every((n) => n.artifact.status === "stale"));
});
test("policy rules require exact supporting passages from standards", () => {
  const p = demoProject(),
    r = p.rules[0];
  assert.equal(groundedRule(r, p.sources), true);
  assert.equal(
    groundedRule({ ...r, quote: "Invented policy requirement" }, p.sources),
    false,
  );
  assert.equal(
    groundedRule(
      r,
      p.sources.map((s) => ({ ...s, kind: "context" })),
    ),
    false,
  );
});
test("imported backups require fresh review and rule confirmation", () => {
  const p = demoProject();
  p.nodes[0].artifact.status = "approved";
  const imported = parseProjectFile(
    JSON.stringify({ format: "stockedby-studio", version: 1, project: p }),
  );
  assert.notEqual(imported.id, p.id);
  assert.ok(imported.rules.every((r) => !r.approved));
  assert.ok(
    imported.nodes.every(
      (n) => n.artifact.status === "stale" && n.artifact.approval === null,
    ),
  );
});
test("malformed imports and duplicate IDs cannot corrupt the workspace", () => {
  assert.throws(() => parseProjectFile("{}"));
  const p = demoProject();
  p.nodes[1].id = p.nodes[0].id;
  assert.throws(() =>
    parseProjectFile(
      JSON.stringify({ format: "stockedby-studio", version: 1, project: p }),
    ),
  );
});
test("approval cannot bypass stale output, blockers or unresolved questions", () => {
  const p = demoProject();
  assert.ok(approvalProblems(p, p.nodes[0]).length);
  assert.equal(approvalProblems(p, p.nodes[2]).length, 0);
  p.nodes[2].artifact.status = "stale";
  assert.ok(approvalProblems(p, p.nodes[2]).length);
});
test("trace links only use explicit requirement identifiers", () => {
  const p = demoProject(),
    rows = traceRows(p);
  assert.equal(rows.length, 3);
  assert.equal(
    rows.find((r) => r.id === "REQ-002").links.filter((l) => l.type === "tests")
      .length,
    2,
  );
});
test("CSV neutralizes formula injection and escapes quotes", () => {
  const p = demoProject();
  p.nodes[0].artifact.items[0].title = '=HYPERLINK("evil")';
  const out = csv(p);
  assert.ok(out.includes('"\'=HYPERLINK(""evil"")"'));
});
test("generation validation bounds inputs and only trusts confirmed grounded rules", () => {
  const p = demoProject(),
    body = {
      type: "brief",
      name: p.name,
      brief: p.brief,
      instruction: "",
      sources: p.sources,
      rules: [
        ...p.rules,
        { ...p.rules[0], quote: "Fake quote", approved: true },
      ],
      upstream: [],
    };
  assert.equal(validateInput(body).rules.length, 2);
  assert.throws(() => validateInput({ ...body, type: "execute" }));
  assert.throws(() => validateInput({ ...body, brief: "x".repeat(17000) }));
});
test("AI output with invented links or policy quotes is marked for review", () => {
  const p = demoProject(),
    input = {
      sources: p.sources,
      upstream: [{ type: "requirements", items: p.nodes[1].artifact.items }],
    };
  const raw = {
    title: "test",
    summary: "test",
    content: "test",
    questions: [],
    findings: [],
    rules: [{ ...p.rules[0], quote: "Unrelated fake rule" }],
    items: [
      {
        id: "S-1",
        title: "Test",
        detail: "Text",
        sourceIds: ["unknown"],
        requirementIds: ["REQ-002", "REQ-FAKE"],
        acceptanceCriteria: [],
      },
    ],
  };
  const result = groundOutput(raw, input);
  assert.equal(result.rules.length, 0);
  assert.deepEqual(result.items[0].sourceIds, []);
  assert.deepEqual(result.items[0].requirementIds, ["REQ-002"]);
  assert.equal(result.findings.length, 2);
});
test("new project has no employer standards or documents", () => {
  const p = newProject();
  assert.equal(p.sources.length, 0);
  assert.equal(p.rules.length, 0);
  assert.equal(p.brief, "");
  assert.ok(p.nodes.every((n) => n.artifact === null));
});

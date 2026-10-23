import test from "node:test";
import assert from "node:assert/strict";
import { demoProject } from "./demo.js";
import { documentQueries, queryResolutionInput, queryRecordsAfter } from "./queries.js";
import { resolveDocumentQuery, updateArtifact, updateContext, parseProjectFile, documentMarkdown, approvalProblems } from "./model.js";
import { reviewQueue } from "./review.js";
import { validateInput } from "./generation.js";
import { generationUpstream } from "./navigation.js";
function fixture() {
  const p = demoProject(), n = p.nodes.find(n => n.type === "requirements");
  n.artifact.questions = ["Who owns invitations?", "What is the pilot size?", "Who owns invitations?"];
  n.artifact.findings = [{ severity: "blocker", issue: "Retention is undecided.", sourceId: "", quote: "" }];
  return { p, n };
}
test("answers are attached to query identity and survive reorder, regeneration and backup", () => {
  const { p, n } = fixture();
  assert.equal(documentQueries(p, n).length, 3);
  let next = resolveDocumentQuery(p, n.id, documentQueries(p, n)[0], "answered", "Operations owns invitations.");
  next = updateArtifact(next, n.id, { ...n.artifact, questions: [...n.artifact.questions].reverse() });
  const q = documentQueries(next, next.nodes.find(x => x.id === n.id)).find(q => q.text === "Who owns invitations?");
  assert.equal(q.status, "answered");
  assert.equal(q.resolution.answer, "Operations owns invitations.");
  assert.equal(parseProjectFile(JSON.stringify({ format: "stockedby-studio", version: 1, project: next })).queryResolutions[0].answer, q.resolution.answer);
  assert.equal(p.queryResolutions, undefined);
});
test("ignoring one query leaves other questions open and expires on changed context or severity", () => {
  const { p, n } = fixture();
  const query = documentQueries(p, n)[2];
  const next = resolveDocumentQuery(p, n.id, query, "ignored");
  assert.equal(documentQueries(next, n)[2].status, "ignored");
  assert.equal(documentQueries(next, n)[0].status, "open");
  const changed = updateContext(next, { brief: "A different retention scope for a new product" });
  assert.equal(documentQueries(changed, n)[2].status, "open");
  assert.equal(documentQueries(changed, n)[2].expired, true);
  assert.equal(queryResolutionInput(changed).length, 0);
  const newFinding = { ...n, artifact: { ...n.artifact, findings: [{ ...n.artifact.findings[0], severity: "warning" }] } };
  assert.equal(documentQueries(next, newFinding)[2].status, "open");
  assert.equal(documentQueries(parseProjectFile(JSON.stringify({ format: "stockedby-studio", version: 1, project: next })), n)[2].status, "open");
});
test("answering invalidates existing drafts; ignore is reversible without silently approving", () => {
  const { p, n } = fixture();
  let next = resolveDocumentQuery(p, n.id, documentQueries(p, n)[0], "answered", "Operations");
  assert.ok(next.nodes.every(x => !x.artifact || x.artifact.status === "stale"));
  assert.ok(approvalProblems(next, next.nodes.find(x => x.id === n.id)).length);
  next = resolveDocumentQuery(next, n.id, documentQueries(p, n)[0], "open");
  assert.equal(queryResolutionInput(next).length, 0);
  assert.throws(() => queryRecordsAfter(p, n.id, documentQueries(p, n)[0], "answered", " "));
});
test("review queue and Word content reflect per-item decisions without hiding the history", () => {
  const { p, n } = fixture();
  let next = resolveDocumentQuery(p, n.id, documentQueries(p, n)[0], "answered", "Operations owns invitations.");
  next = resolveDocumentQuery(next, n.id, documentQueries(p, n)[2], "ignored");
  const queue = reviewQueue(next).filter(q => q.nodeId === n.id);
  assert.ok(!queue.some(q => q.title === "Who owns invitations?" || q.title === "Retention is undecided."));
  assert.ok(queue.some(q => q.title === "What is the pilot size?"));
  const md = documentMarkdown(next.nodes.find(x => x.id === n.id), next);
  assert.ok(md.includes("[answered] Who owns invitations?"));
  assert.ok(md.includes("[ignored] Retention is undecided."));
  assert.ok(md.includes("Answer: Operations owns invitations."));
});
test("continuing carries the chosen draft and open queries without approving it, including retry", () => {
  const { p, n } = fixture();
  const next = resolveDocumentQuery(p, n.id, documentQueries(p, n)[0], "answered", "Operations");
  const target = next.nodes.find(x => x.type === "stories");
  target.sourceNodeId = n.id;
  const upstream = generationUpstream(next, target.id);
  const prd = upstream.find(x => x.type === "requirements");
  assert.equal(prd.status, "stale");
  assert.ok(prd.questions.includes("What is the pilot size?"));
  assert.equal(prd.approval, null);
  const input = validateInput({ type: target.type, name: next.name, brief: next.brief, instruction: "", sources: next.sources, rules: next.rules, upstream, queryResolutions: queryResolutionInput(next) });
  assert.equal(input.queryResolutions[0].answer, "Operations");
  assert.deepEqual(input.upstream.find(x => x.type === "requirements").questions, prd.questions);
  assert.throws(() => validateInput({ ...input, queryResolutions: [{ ...input.queryResolutions[0], answer: "x".repeat(2001) }] }));
});

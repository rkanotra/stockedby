import test from 'node:test';
import assert from 'node:assert/strict';
import { newProject } from '../studio/model.js';
import { allowedPath, changeTargets, validateProposal, applyProposal } from './changes.js';
import { teamDemo } from './demo.js';
const raw = (patches) => ({ title: 'Change', summary: 'A focused update', patches, questions: [], risks: [] });
test('AI cannot write ownership, approval, prototype code or source documents', () => {
  for (const path of [['created_by'], ['sources','0','text'], ['nodes','0','artifact','approval'], ['nodes','0','artifact','prototype'], ['__proto__','polluted'], ['nodes','-1','artifact','content']]) assert.equal(allowedPath(path),false);
  const p = newProject();
  assert.throws(() => validateProposal(raw([{ targetId: '__proto__', after:'x',reason:'x',evidenceIds:[] }]),p), /unsupported/);
});
test('targets include stable IDs and individual acceptance criteria', () => {
  const d = teamDemo().projects[0].document;
  assert.ok(changeTargets(d).some(t => t.id.includes(':ac:')));
  assert.ok(changeTargets(d).every(t => allowedPath(t.path)));
});
test('unknown evidence and duplicate edits fail closed', () => {
  const p = newProject(), patch = { targetId:'brief',after:'New brief',reason:'User requested',evidenceIds:[] };
  assert.throws(() => validateProposal(raw([{ ...patch,evidenceIds:['invented-policy'] }]),p));
  assert.throws(() => validateProposal(raw([patch,patch]),p));
});
test('no-op edits are removed and conflicts preserve original document', () => {
  const p = newProject(), patch = { targetId:'brief',after:'',reason:'No change',evidenceIds:[] };
  assert.equal(validateProposal(raw([patch]),p).patches.length,0);
  const proposal = validateProposal(raw([{...patch,after:'A new brief'}]),p);
  assert.throws(() => applyProposal({...p,brief:'Changed by a teammate'},proposal),/changed/);
  assert.equal(p.brief,'');
});
test('applying approved text preserves prototype data and unrelated fields', () => {
  const data = teamDemo(), p = data.projects[0].document;
  const before = structuredClone(p), updated = applyProposal(p,data.changes[0].proposal);
  assert.deepEqual(p,before);
  assert.deepEqual(updated.nodes.find(n => n.type==='prototype').artifact.prototype,p.nodes.find(n => n.type==='prototype').artifact.prototype);
  assert.deepEqual(updated.sources,p.sources);
  assert.ok(updated.nodes.filter(n => n.artifact).every(n => n.artifact.approval === null && n.artifact.status==='stale'));
});

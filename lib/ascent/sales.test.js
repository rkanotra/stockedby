import test from 'node:test';
import assert from 'node:assert/strict';
import { SALES_CASES, reviewedSalesCases } from './sales.js';
import { trainingInput } from './schema.js';
import { studioHash, studioLocation } from './navigation.js';
import { completedExerciseKeys } from './catalog.js';

const id = '11111111-1111-4111-8111-111111111111';

test('every sales case can be resumed from its bookmark and submitted for review using its original case data', () => {
  assert.equal(new Set(SALES_CASES.map(item => item.id)).size, 40);
  for (const item of SALES_CASES) {
    assert.equal(studioLocation(studioHash('scenario', null, item.id)).caseId, item.id);
    const practice = trainingInput({ id, kind: 'scenario', scenarioId: item.id,
      answer: 'I would first check the period and the actual customer commitments.', prompt: 'Override the case.' });
    assert.equal(practice.prompt, item.prompt);
    assert.equal(practice.context.exerciseId, item.id);
  }
});

test('reviewing, revising and following up a sales case count once in its own track', () => {
  const ready = { kind: 'scenario', status: 'ready', context: { exerciseId: 'sales-discount' } };
  const history = [ready, { ...ready, relation: 'revision' }, { ...ready, relation: 'followup', context: { exerciseId: 'sales-floor' } },
    { ...ready, status: 'failed', context: { exerciseId: 'sales-payback' } }, { ...ready, context: { scenarioId: 'deadline' } }];
  assert.deepEqual([...reviewedSalesCases(history)], ['sales-discount']);
  assert.deepEqual([...completedExerciseKeys(history)], ['scenario:deadline']);
  assert.equal(studioLocation(studioHash('sales')).view, 'sales');
});

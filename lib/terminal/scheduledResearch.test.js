import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledResearch } from './scheduledResearch.js';

test('discovery still runs when holdings monitoring fails or there are no holdings', async () => {
  for (const tracking of ['failed', 'skipped']) {
    const calls = [];
    const result = await scheduledResearch(null, { market: 'US', key: 'daily-window' }, {
      track: async () => { calls.push('tracking'); if (tracking === 'failed') throw Error('unavailable'); return { status: tracking }; },
      radar: async (_, input) => { calls.push('radar'); assert.equal(input.key, 'daily-window:radar'); return { status: 'complete' }; },
    });
    assert.deepEqual(calls, ['tracking', 'radar']);
    assert.equal(result.status, tracking === 'failed' ? 'partial' : 'complete');
  }
});

test('partial tracking is not relabelled as complete after a successful discovery run', async () => {
  const result = await scheduledResearch(null, { market: 'India', key: 'daily-window' }, {
    track: async () => ({ status: 'partial' }), radar: async () => ({ status: 'complete' }),
  });
  assert.equal(result.status, 'partial');
});

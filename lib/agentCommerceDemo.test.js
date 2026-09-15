import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agentCommerceReducer as reduce, INITIAL_DEMO_STATE } from './agentCommerceDemo.js';

test('commerce demo stops at approval and cannot advance into payment automatically', () => {
  let state = INITIAL_DEMO_STATE;
  for (let i = 0; i < 3; i++) state = reduce(state, { type: 'advance' });
  assert.deepEqual(state, { phase: 3, playing: false });
  assert.equal(reduce(state, { type: 'advance' }), state);
  assert.equal(reduce(state, { type: 'toggle' }), state);
  const approved = reduce(state, { type: 'approve', reducedMotion: false });
  assert.deepEqual(approved, { phase: 4, playing: true });
  assert.deepEqual(reduce(approved, { type: 'advance' }), { phase: 5, playing: false });
});

test('commerce demo pause blocks advancement and replay starts a fresh journey', () => {
  const paused = reduce({ phase: 1, playing: true }, { type: 'toggle' });
  assert.equal(reduce(paused, { type: 'advance' }), paused);
  assert.deepEqual(reduce(paused, { type: 'toggle' }), { phase: 1, playing: true });
  assert.deepEqual(reduce({ phase: 5, playing: false }, { type: 'replay' }), INITIAL_DEMO_STATE);
});

test('reduced-motion approval shows a completed demo without animated payment', () => {
  assert.deepEqual(reduce(INITIAL_DEMO_STATE, { type: 'approve', reducedMotion: true }), { phase: 5, playing: false });
  assert.equal(reduce(INITIAL_DEMO_STATE, { type: 'approve', reducedMotion: false }), INITIAL_DEMO_STATE);
});

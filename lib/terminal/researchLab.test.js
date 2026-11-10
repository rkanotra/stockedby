import test from 'node:test';
import assert from 'node:assert/strict';
import { historicalRisk, scenarioMath } from './researchLab.js';
const series = closes => closes.map((close, i) => ({ date: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10), close }));
const asOf = '2026-11-10T10:00:00Z';
test('drawdown measures running peak, recovery and a fresh peak independently of final return', () => {
  const risk = historicalRisk(series([100, 120, 90, 110, 130, 117]), { asOf });
  assert.equal(risk.maxDrawdown, -25);
  assert.equal(risk.peakDate, '2026-01-02');
  assert.equal(risk.troughDate, '2026-01-03');
  assert.ok(Math.abs(risk.currentDrawdown + 10) < 1e-10);
  assert.equal(risk.volatility60, null); assert.equal(risk.outcomes.count, 0);
  assert.equal(risk.stale, true);
});
test('future and current snapshot-day closes cannot leak into historical measurements', () => {
  const risk = historicalRisk(series([100, 90, 2000, 1]), { asOf: '2026-01-03T12:00:00Z' });
  assert.equal(risk.count, 2); assert.equal(risk.end, '2026-01-02'); assert.equal(risk.excludedFuture, 2);
  assert.ok(Math.abs(risk.maxDrawdown + 10) < 1e-10);
});
test('malformed or conflicting data fails closed; identical duplicates do not inflate samples', () => {
  for (const points of [[{ date: '2026-02-30', close: 100 }], series([100, NaN]), series([100, 0]), [{ date: '2026-01-01', close: '100' }], [...series([100, 90]), { date: '2026-01-01', close: 101 }]]) assert.equal(historicalRisk(points, { asOf }).available, false);
  assert.equal(historicalRisk(series([100, 90]), { asOf: 'bad' }).available, false);
  assert.equal(historicalRisk([series([100])[0], ...series([100, 90])].reverse(), { asOf }).count, 2);
});
test('outcomes use non-overlapping intervals; partial tails cannot inflate the sample', () => {
  const risk = historicalRisk(series(Array.from({ length: 66 }, (_, i) => 100 * 1.01 ** i)), { asOf });
  assert.equal(risk.outcomes.count, 3); assert.equal(risk.outcomes.positive, 3); assert.equal(risk.windows[0].end, risk.windows[1].start);
  assert.ok(Math.abs(risk.outcomes.median - (1.01 ** 20 - 1) * 100) < 1e-10);
  assert.ok(risk.volatility60 < 1e-10);
});
test('volatility uses 60 log returns and sample variance, not level variance or a probability', () => {
  const logs = Array.from({ length: 60 }, (_, i) => i % 2 ? -.02 : .02), closes = [100];
  for (const r of logs) closes.push(closes.at(-1) * Math.exp(r));
  const risk = historicalRisk(series(closes), { asOf });
  assert.ok(Math.abs(risk.volatility60 - Math.sqrt(60 * .02 ** 2 / 59) * Math.sqrt(252) * 100) < 1e-8);
});
test('suspensions or missing stretches withhold daily metrics and windows crossing gaps', () => {
  const points = series(Array.from({ length: 61 }, () => 100));
  points[60].date = '2026-06-01';
  const risk = historicalRisk(points, { asOf });
  assert.equal(risk.gaps, 1); assert.equal(risk.volatility60, null); assert.equal(risk.outcomes.count, 2);
});
test('scenario costs are charged in both outcomes and missing inputs are never coerced to zero', () => {
  assert.deepEqual(scenarioMath({ gain: 15, loss: 15, probability: 50, costs: .5 }), { expected: -.5, breakEven: 15.5 / 30 * 100, attainable: true });
  assert.equal(scenarioMath({ gain: 20, loss: 10, probability: 40, costs: 1 }).expected, 1);
  for (const value of ['', ' ', null, NaN, Infinity, false, [], -1, 101]) assert.equal(scenarioMath({ gain: 15, loss: 15, probability: value, costs: .5 }), null);
  assert.equal(scenarioMath({ gain: 1, loss: 10, probability: 100, costs: 2 }).attainable, false);
});

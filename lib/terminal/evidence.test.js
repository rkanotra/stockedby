import test from 'node:test';
import assert from 'node:assert/strict';
import { checkResearchEvidence, checkSavedResearch } from './evidence.js';

test('unreturned evidence and cross-security inline citations withhold the thesis', () => {
  const company = 'https://issuer.example/results', bitcoin = 'https://news.example/bitcoin';
  const research = { sources: [{ url: company }, { url: bitcoin }], gaps: [], assessments: [
    { exchange: 'NASDAQ', symbol: 'TEST', facts: [{ claim: 'Results released', url: company }], catalyst: `Results [source](${company}?utm_source=openai)` },
    { exchange: 'CRYPTO', symbol: 'BTC', facts: [{ claim: 'Flows changed', url: bitcoin }], catalyst: `Bitcoin flows improved [source](${company})` },
    { exchange: 'NYSEARCA', symbol: 'GLD', facts: [{ claim: 'Demand improved', url: 'https://unknown.example' }] },
  ] };
  const checked = checkResearchEvidence(research);
  assert.deepEqual(checked.assessments.map(a => a.symbol), ['TEST']);
  assert.equal(checked.gaps.length, 2);
  assert.equal(research.assessments.length, 3);
  assert.deepEqual(checkResearchEvidence(checked), checked);
});

test('saved research is checked on read without changing positions or market data', () => {
  const research = { sources: [], assessments: [{ exchange: 'CRYPTO', symbol: 'BTC', facts: [{ url: 'https://unknown.example' }] }] };
  const state = { document: { positions: ['unchanged'] }, cache: { 'research:old': research, fx: { value: 3.67 } }, runs: [{ result: { research: [research] } }] };
  const checked = checkSavedResearch(state);
  assert.deepEqual(checked.cache['research:old'].assessments, []);
  assert.deepEqual(checked.runs[0].result.research[0].assessments, []);
  assert.equal(checked.document, state.document);
  assert.equal(checked.cache.fx, state.cache.fx);
});

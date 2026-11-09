import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePosition, normalizeState, importPreview, valuePortfolio, instrumentId } from './domain.js';
import { portfolioPositions, portfolioCurrency, portfolioView } from './portfolios.js';
import { imageRowsCSV, parseImageImport } from './imageImport.js';
import { trackingHoldings, trackingIdentity, trackingView } from './holdingNews.js';
import { scan } from './scan.js';
import { fetchInstrument } from './feeds.js';
import { queuePortfolioTracking } from './trackingServer.js';

const raw = overrides => ({ name: 'Fictional US company', symbol: 'FICT', exchange: 'NASDAQ', currency: 'USD', assetClass: 'equity', quantity: '2', costBasis: '100', mapping: 'confirmed', ...overrides });
const fixtures = () => [normalizePosition(raw()), normalizePosition(raw({ name: 'Fictional India company', symbol: 'INCO', exchange: 'NSE', currency: 'INR' })), normalizePosition(raw({ name: 'Fictional India fund · Direct Growth', symbol: '123456', exchange: 'UNRESOLVED', currency: 'INR', assetClass: 'mutual_fund', quantity: '12.123456789012345678', snapshotValue: '1200' })), normalizePosition(raw({ name: 'Fictional US fund · Investor', symbol: 'FUNDX', exchange: 'USMF', assetClass: 'mutual_fund' }))];

test('regional portfolios separate existing stocks and funds without rewriting the saved document', () => {
  const positions = fixtures(), now = new Date().toISOString();
  const state = { document: { positions, settings: { currency: 'AED' } }, cache: {}, alerts: [{ data: { security: 'NASDAQ:FICT' } }, { data: { security: 'INMF:123456' } }], runs: ['US', 'India', 'All', 'Asia'].map(market => ({ result: { market, research: [{ market }] } })) };
  const original = JSON.stringify(state);
  for (const [market, currency, count] of [['US','USD',1],['India','INR',2]]) {
    const view = portfolioView(state, market);
    assert.equal(view.document.positions.length, 2);
    assert.equal(view.alerts.length, 1);
    assert.equal(view.runs.length, count);
    assert.equal(portfolioCurrency(market, 'AED'), currency);
    const cache = Object.fromEntries(positions.map(p => [instrumentId(p), { quote: { price: 100, currency: p.currency, asOf: now, quality: 'delayed' } }]));
    assert.equal(valuePortfolio(view.document.positions, cache, null, currency).rows.length, 2);
  }
  assert.equal(JSON.stringify(state), original);
  assert.equal(portfolioView(state, 'All'), state);
  assert.equal(portfolioPositions([raw({ exchange: 'UNRESOLVED' })], 'US').length, 1);
});

test('fund units, plans and snapshots survive import and reload; reported values never become quotes', async () => {
  const p = fixtures()[2];
  assert.equal(p.exchange, 'INMF'); assert.equal(p.unit, 'units'); assert.equal(p.mapping, 'unresolved');
  const response = { status: 'completed', output_text: JSON.stringify({ warnings: [], holdings: [{ ...p, costBasis: '', issues: [] }] }) };
  const extracted = parseImageImport(response);
  const preview = importPreview(imageRowsCSV(extracted.holdings), [], { market: 'India' });
  assert.equal(preview[0].status, 'ready');
  const saved = normalizeState({ positions: [preview[0].position] }).positions[0];
  assert.equal(saved.quantity, p.quantity); assert.equal(saved.snapshotValue, '1200'); assert.equal(saved.assetClass, 'mutual_fund'); assert.equal(saved.name, p.name);
  assert.equal(valuePortfolio([saved], {}, null, 'INR').total, null);
  assert.match((await fetchInstrument(saved)).unavailable, /NAV feed not connected/);
  assert.throws(() => imageRowsCSV([{ ...p, symbol: '' }]), /scheme code or ISIN/);
});

test('import destinations reject wrong markets and isolate same-code funds', () => {
  const india = raw({ exchange: 'INMF', currency: 'INR', assetClass: 'mutual_fund' });
  const us = raw({ exchange: 'USMF', assetClass: 'mutual_fund' });
  const csv = imageRowsCSV([india,us]);
  assert.deepEqual(importPreview(csv, [], { market: 'India' }).map(r=>r.status), ['ready','error']);
  assert.deepEqual(importPreview(csv, [], { market: 'US' }).map(r=>r.status), ['error','ready']);
  assert.deepEqual(importPreview(csv).map(r=>r.status), ['ready','ready']);
  assert.throws(()=>importPreview(csv,[],{market:'invalid'}), /Choose/);
  assert.throws(()=>normalizePosition({ ...india, currency: 'USD', mapping: 'unresolved' }), /INR/);
  assert.throws(()=>normalizePosition({ ...india, assetClass: 'equity' }), /Mutual fund/);
  assert.throws(()=>normalizePosition({ ...india, exchange: 'NSE' }), /fund as the listing/);
});

test('portfolio news includes funds and only exposes selected holdings and explanations', () => {
  const positions=fixtures(), now=new Date().toISOString();
  const state={document:{positions},cache:{'portfolio-news':{identity:trackingIdentity(positions),items:[{url:'https://example.com/event',publishedAt:now,holdingImpacts:trackingHoldings(positions).map(p=>({security:p.key,reason:'Fictional reason',mechanism:'Fictional mechanism'}))}]}}};
  assert.equal(trackingHoldings(positions).length,4);
  for(const market of ['US','India']){
    const view=trackingView(portfolioView(state,market));
    assert.equal(view.total,2);assert.equal(view.items[0].holdingImpacts.length,2);
    assert.ok(view.items[0].holdingImpacts.every(i=>i.holding.market===market));
  }
});

test('AI briefs and technical checks receive only the requested regional portfolio', async () => {
  const positions=fixtures(), captured=[], fetched=[], writes=[];
  const store=async(action,body)=>action==='begin'?{id:'fictional',lease:'fictional'}:action==='load'?{document:{positions,settings:{}},cache:{}}:writes.push({action,body});
  const deps={fetchNews:async()=>({items:[]}),fetchFX:async()=>({}),fetchInstrument:async p=>{fetched.push(p);return {unavailable:'Fixture'};},runResearch:async c=>{captured.push(c);return {market:c.market,news:[],sources:[],assessments:[],gaps:[]};}};
  await scan(store,{kind:'brief',market:'India'},deps);
  assert.deepEqual(captured[0].positions.map(p=>p.currency),['INR','INR']);
  assert.ok(fetched.every(p=>p.currency==='INR'));
  assert.equal(positions.length,4);
  assert.equal(writes.find(w=>w.action==='finish').body.result.market,'India');
});

test('manual news checks reserve the selected portfolio while automatic saves keep both', async () => {
  const calls=[], jobs=[];
  const store=async(action,body)=>{calls.push({action,body});if(action==='begin')return {id:'fictional',lease:'fictional'};};
  const state={document:{positions:fixtures()},cache:{},scheduled:false};
  await queuePortfolioTracking(store,state,job=>jobs.push(job),{market:'India'});
  assert.match(calls.find(c=>c.action==='begin').body.key,/holdings:India:/);
  assert.equal(calls.find(c=>c.action==='cache').body.data.market,'India');
  assert.equal(jobs.length,1);
});

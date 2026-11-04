import test from 'node:test';
import assert from 'node:assert/strict';
import { trackingHoldings, trackingIdentity, headlineMatches, currentHoldingImpacts, mergeHoldingImpacts, trackingView } from './holdingNews.js';
import { reservePortfolioTracking, trackPortfolio, fetchHoldingHeadlines } from './portfolioTracking.js';
import { queuePortfolioTracking } from './trackingServer.js';
import { validateResearch, runResearch } from './research.js';

const now = new Date('2026-11-04T10:00:00Z');
const p = (change = {}) => ({ id:'fictional', name:'Example Corporation', symbol:'EXAMPLE', exchange:'NASDAQ', currency:'USD', assetClass:'equity', mapping:'confirmed', quantity:'10', account:'PRIVATE_ACCOUNT', costBasis:'5000', ...change });
const story = (change = {}) => ({ title:'Example raises guidance', url:'https://example.com/results', publishedAt:'2026-11-04T08:00:00Z', material:true, reportedFact:'The issuer raised its full-year revenue outlook.', holdingImpacts:[{ security:'NASDAQ:EXAMPLE', relationship:'direct', direction:'positive', reason:'You hold Example.', mechanism:'Higher expected revenue could improve earnings.', watchFor:'Margins in the next results.', uncertainty:'The outlook may not be achieved.' }], ...change });
function fixture(positions = [p()], cache = {}) {
  const state = { document: { positions }, cache, scheduled:false }; const calls = [];
  const store = async (action, args) => {
    calls.push([action,args]);
    if (action === 'load') return state;
    if (action === 'begin') return { id:'run', lease:'lease' };
    if (action === 'cache') state.cache[args.key] = args.data;
    if (action === 'schedule') state.scheduled = args.enabled;
    return {};
  };
  return { state, store, calls };
}
const dependencies = { fetchHoldingHeadlines:async() => [], runResearch:async() => ({ news:[story()], sources:[{ url:'https://example.com/results' }], gaps:[], assessments:[] }) };

test('news can follow unconfirmed India/US imports without exporting private amounts or guessing exchanges', () => {
  const positions = [p(),p({ exchange:'UNRESOLVED',currency:'INR',mapping:'unresolved' }),p({ exchange:'DFM',currency:'AED' }),p({ symbol:'OLD',archived:true })];
  const holdings = trackingHoldings(positions);
  assert.deepEqual(holdings.map(h => h.key), ['NASDAQ:EXAMPLE','INR:EXAMPLE']);
  assert.ok(!JSON.stringify(holdings).includes('PRIVATE_ACCOUNT')); assert.ok(!JSON.stringify(holdings).includes('5000'));
  assert.equal(trackingIdentity([p()]), trackingIdentity([p({ quantity:'1000',account:'OTHER' })]));
  assert.equal(headlineMatches('It is a strong quarter',p({ name:'Fictional Technology',symbol:'IT' })),false);
  assert.equal(headlineMatches('Example raises guidance',p()),true);
});
test('impact cards exclude stale news, unrelated/archived holdings and unsafe sources', () => {
  const feed = { items:[story(),story({ url:'javascript:alert(1)' }),story({ url:'https://example.com/old',publishedAt:'2025-01-01' }),story({ url:'https://example.com/future',publishedAt:'2027-01-01' }),story({ url:'https://example.com/unrelated',holdingImpacts:[{...story().holdingImpacts[0],security:'NASDAQ:OTHER'}] })] };
  assert.equal(currentHoldingImpacts(feed,[p()],now.getTime()).length,1);
  assert.equal(currentHoldingImpacts(feed,[p({ archived:true })],now.getTime()).length,0);
  assert.equal(currentHoldingImpacts({...feed,identity:trackingIdentity([p()])},[p({name:'A different company'})],now.getTime()).length,0);
});
test('a US check preserves Indian connections to the same global news story', () => {
  const previous=story({holdingImpacts:[{...story().holdingImpacts[0],security:'NSE:INDIA'}]});
  const merged=mergeHoldingImpacts([story()],[previous]);
  assert.deepEqual(merged[0].holdingImpacts.map(i=>i.security),['NSE:INDIA','NASDAQ:EXAMPLE']);
});
test('holding news validators reject fabricated identifiers, dates and sources', () => {
  const metadata={candidates:[{groundingMetadata:{groundingChunks:[{web:{uri:'https://example.com/results'}}]}}]};
  const raw={summary:'Analysis',assessments:[],gaps:[],news:[story({holdingImpacts:[...story().holdingImpacts,{...story().holdingImpacts[0],security:'NASDAQ:NOT_HELD'}] }),story({url:'https://invented.example'})]};
  const checked=validateResearch(raw,metadata,[p()],'tracking',now.getTime());
  assert.equal(checked.news.length,1); assert.equal(checked.news[0].holdingImpacts.length,1);
});
test('company queries contain public names only and filter wrong-company headlines', async () => {
  let requested;
  const rss='<rss><channel><item><title>Example raises guidance - Reuters</title><link>https://example.com/results</link><pubDate>2026-11-04T08:00:00Z</pubDate><source>Reuters</source></item><item><title>Another company releases results - Reuters</title><link>https://example.com/other</link><pubDate>2026-11-04T08:00:00Z</pubDate><source>Reuters</source></item></channel></rss>';
  const results=await fetchHoldingHeadlines(trackingHoldings([p()])[0],{now:now.getTime(),fetcher:async url=>{requested=url;return new Response(rss);}});
  assert.equal(results.length,1); assert.ok(!requested.includes('PRIVATE_ACCOUNT')); assert.ok(!requested.includes('5000'));
});
test('tracking publishes explained alerts, preserves coverage and stops publishing for removed holdings', async () => {
  const f=fixture(); const result=await trackPortfolio(f.store,{now},dependencies);
  assert.equal(result.status,'complete'); assert.equal(result.result.checked,1);
  assert.equal(f.state.cache['portfolio-news'].items.length,1);
  const finish=f.calls.find(([a])=>a==='finish')[1]; assert.equal(finish.alerts[0].data.mechanism,story().holdingImpacts[0].mechanism);
  const removed=fixture();
  await trackPortfolio(removed.store,{now},{...dependencies,runResearch:async()=>{removed.state.document.positions=[];return dependencies.runResearch();}});
  assert.equal(removed.calls.find(([a])=>a==='finish')[1].alerts.length,0);
});
test('partial source and AI failures retain prior explanations with their dates and visible gaps', async () => {
  const f=fixture([p()],{'portfolio-news':{items:[story()],lastAnalysisAt:'2026-11-03T10:00:00Z'}});
  const result=await trackPortfolio(f.store,{now},{fetchHoldingHeadlines:async()=>{throw Error('Unavailable');},runResearch:async()=>{throw Error('AI quota unavailable');}});
  assert.equal(result.status,'partial'); assert.equal(f.state.cache['portfolio-news'].items[0].publishedAt,story().publishedAt);
  assert.equal(f.state.cache['portfolio-news'].analysisError,'AI quota unavailable');
  assert.equal(trackingView(f.state,now.getTime()).fresh,0);
});
test('large portfolios rotate unchecked holdings and scheduled market scans stay in their region', async () => {
  const positions=Array.from({length:41},(_,n)=>p({symbol:`S${n}`,name:`Stock ${n}`}));
  const f=fixture(positions); const seen=[];
  const deps={fetchHoldingHeadlines:async holding=>{seen.push(holding.symbol);return [];},runResearch:async()=>({news:[],gaps:[]})};
  await trackPortfolio(f.store,{now},deps); assert.equal(seen.length,40);assert.equal(f.state.cache['portfolio-news'].deferred,1);
  seen.length=0;await trackPortfolio(f.store,{now:new Date(now.getTime()+86400000)},deps);assert.equal(seen[0],'S40');
  const mixed=fixture([p(),p({symbol:'INDIA',exchange:'NSE',currency:'INR'})]);seen.length=0;
  await trackPortfolio(mixed.store,{now,market:'India'},deps);assert.deepEqual(seen,['INDIA']);
});
test('repeated reservations do not start another research job', async () => {
  const result=await trackPortfolio(async action=>action==='load'?{document:{positions:[p()]},cache:{}}:{existing:true,status:'complete'}, {now}, {runResearch:()=>{throw Error('must not run');}});
  assert.equal(result.existing,true);
  const f=fixture();await reservePortfolioTracking(f.store,{positions:[p()],now});
  assert.equal(f.state.cache['portfolio-tracking-job'].status,'running');
});
test('failed checks can retry immediately; empty regional scans do not spend an AI allowance', async () => {
  const calls=[];
  await reservePortfolioTracking(async(action,args)=>{calls.push([action,args]);return action==='begin'&&calls.length===1?{existing:true,status:'failed'}:{id:'retry',lease:'test'};},{positions:[p()],now});
  assert.equal(calls.filter(([a])=>a==='begin').length,2);
  assert.notEqual(calls[0][1].key,calls[1][1].key);
  const f=fixture([p()]);
  assert.equal((await trackPortfolio(f.store,{market:'India',now},dependencies)).status,'skipped');
  assert.equal(f.calls.filter(([a])=>a==='begin').length,0);
});
test('save handoff enables daily tracking, respects a pause, and reports quota failure without undoing saved holdings', async () => {
  const f=fixture(), deferred=[];
  const result=await queuePortfolioTracking(f.store,f.state,task=>deferred.push(task),{enableSchedule:true,secret:'fictional-test-secret-1234567890-1234567890-1234567890',now});
  assert.equal(result.enabled,true);assert.equal(deferred.length,1);assert.equal(result.status,'running');
  const paused=fixture([p()],{'tracking-preferences':{enabled:false}});
  assert.equal((await queuePortfolioTracking(paused.store,paused.state,()=>{throw Error('must not start');},{enableSchedule:true,now})).status,'paused');
  const limited=fixture();const store=async(a,args)=>{if(a==='begin')throw Object.assign(Error('Daily research limit reached'),{status:429});return limited.store(a,args);};
  const failure=await queuePortfolioTracking(store,limited.state,()=>{}, {now});
  assert.equal(failure.status,'deferred');assert.match(failure.message,/Holdings saved/);assert.equal(limited.state.document.positions.length,1);
});
test('tracking AI prompt is portfolio-specific, allows unconfirmed search leads, and excludes balances', async () => {
  let prompt;
  const client={models:{generateContent:async input=>{prompt=input.contents;return {text:JSON.stringify({summary:'No verified developments.',news:[],assessments:[],gaps:['Insufficient evidence']}),candidates:[]};}}};
  await runResearch({kind:'tracking',market:'All',positions:[p({exchange:'UNRESOLVED',mapping:'unresolved'})],cache:{},now},client);
  assert.match(prompt,/USD:EXAMPLE/);assert.match(prompt,/mechanism/);assert.ok(!prompt.includes('PRIVATE_ACCOUNT'));assert.ok(!prompt.includes('5000'));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { statementRows, mergeStatements, financialObservations, researchHoldings, fetchDossierEvidence, dossierChanges } from './dossierData.js';
import { runDossier, validateDossierReport, analyzeDossier, DOSSIER_SCHEMA } from './dossier.js';
import { narrativeFinancials, financialAmountIssues } from './researchAmounts.js';
import { parseYahooQuote } from './prices.js';
const now=new Date('2026-11-09T08:00:00Z');
const holding={symbol:'ACME',name:'Fictional Co',exchange:'NASDAQ',currency:'USD',assetClass:'equity',quantity:'12',costBasis:'500',account:'Private account',mapping:'confirmed'};
const evidence=()=>({security:'NASDAQ:ACME',identity:{symbol:'ACME',exchange:'NASDAQ',currency:'USD',assetClass:'equity'},name:'Fictional Co',fetchedAt:now.toISOString(),annual:[],quarterly:[],technical:null,observations:[],gaps:['No historical valuation.'],sources:[{id:'profile',title:'Issuer',url:'https://example.com/investors'},{id:'gaps',title:'Missing evidence',url:null}]});
function storeFixture(positions=[holding]){
  const state={document:{positions},cache:{},runs:[]},calls=[];
  const store=async(action,args={})=>{calls.push({action,args});if(action==='load')return structuredClone(state);if(action==='begin')return {id:'run',token:'token'};if(action==='cache')state.cache[args.key]=structuredClone(args.data);if(action==='finish')state.runs.push(args);return {};};
  return {state,calls,store};
}
const report=()=>({...Object.fromEntries(Object.keys(DOSSIER_SCHEMA.properties).filter(k=>k!=='gaps').map(k=>[k,{text:'Conditional assessment; further evidence required.',evidenceIds:['profile'],sourceURLs:[]}])),gaps:['Confirm with issuer filings.'],challenge:{assumption:{text:'A recurring demand hypothesis.',evidenceIds:['profile'],sourceURLs:[]},alternative:{text:'A cyclical rebound may explain growth.',evidenceIds:['profile'],sourceURLs:[]},falsifier:{text:'Declining retention would weaken the thesis.',evidenceIds:['gaps'],sourceURLs:[]},question:'What evidence distinguishes recurring growth from a cyclical rebound?'},decision:{text:'Wait for corroborated evidence.',evidenceIds:['profile'],sourceURLs:[],stance:'Wait',confidence:'Low'}});

test('financial amounts preserve currency and reject tenfold crore conversion errors',()=>{
  const data={...evidence(),financialCurrency:'INR',annual:[{date:'2026-03-31',operatingCash:167409700000,freeCashFlow:-119317800000,revenue:2842251900000}],quarterly:[]};
  assert.equal(narrativeFinancials(data).annual[0].operatingCash,'INR 167.41 billion');
  assert.equal(narrativeFinancials(data).annual[0].freeCashFlow,'INR -119.32 billion');
  assert.deepEqual(financialAmountIssues('Cash flow was INR 167.41 billion (₹16,740.97 crore), and FCF INR -119.32 billion.',data),[]);
  assert.deepEqual(financialAmountIssues('Cash flow was ₹1,67,409.7 crore.',data),['₹1,67,409.7 crore']);
  assert.equal(financialAmountIssues('Cash flow was USD 167.41 billion.',data).length,1);
  const raw=report();raw.financialHealth.text='Cash flow was ₹1,67,409.7 crore.';
  assert.throws(()=>validateDossierReport(raw,{},data),/did not match the source table/);
  raw.financialHealth.text='Cash flow was INR 167.41 billion.';
  assert.doesNotThrow(()=>validateDossierReport(raw,{},data));
});

test('research universe is active India/US portfolio positions only, deduplicated; never a sample watchlist',()=>{
  assert.deepEqual(researchHoldings([holding,{...holding,quantity:'4'}, {...holding,symbol:'OLD',archived:true},{...holding,symbol:'WATCH',quantity:'0'},{...holding,symbol:'UAE',exchange:'DFM'},{...holding,symbol:'BTC',assetClass:'crypto'},{...holding,symbol:'IND',exchange:'NSE',currency:'INR'}]).map(p=>p.symbol),['ACME','IND']);
  assert.deepEqual(researchHoldings(),[]);
});
test('statement dates and nulls stay honest; matching annual periods are required for YoY',()=>{
  const rows=statementRows({ACME:{dates:['2026-09-30','2026-02-30','2028-01-01','2026-09-30','2025-09-30'],data:[{metric:'Total Revenue','2026-09-30':120,'2025-09-30':100},{metric:'Operating Income','2026-09-30':null,'2025-09-30':20},{metric:'Net Income','2026-09-30':'unknown'}]}},'ACME',now.getTime());
  assert.equal(rows.length,2);assert.equal(rows[0].operatingIncome,null);assert.equal(rows[0].netIncome,null);
  const observations=financialObservations([],mergeStatements(rows),{now:now.getTime()});
  assert.equal(observations.length,1);assert.ok(Math.abs(observations[0].value-20)<1e-8);
  assert.deepEqual(financialObservations([],mergeStatements([rows[0],{...rows[1],date:'2026-06-30'}]),{now:now.getTime()}),[]);
  assert.deepEqual(financialObservations([],mergeStatements(rows),{now:Date.parse('2028-01-01')}),[]);
});
test('loss/zero revenue bases withhold growth; cash-flow heuristics do not apply to financial companies',()=>{
  const annual=mergeStatements([{date:'2026-09-30',revenue:100,operatingIncome:20,netIncome:10,operatingCash:12,freeCashFlow:5},{date:'2025-09-30',revenue:-50}]);
  const bank=financialObservations(annual,annual,{financial:true,now:now.getTime()});
  assert.deepEqual(bank,[]);
  const industrial=financialObservations(annual,[],{now:now.getTime()});assert.equal(industrial.find(o=>o.id==='cash-conversion').value,1.2);
  assert.equal(financialObservations([{...annual[0],netIncome:-10}],[],{now:now.getTime()}).some(o=>o.id==='cash-conversion'),false);
});
test('data disappearing never produces a resolved-risk or all-clear message',()=>{
  const previous={...evidence(),observations:[{id:'revenue-yoy',tone:'negative'}]};
  assert.match(dossierChanges(previous,evidence()).join(' '),/Missing observations do not mean earlier risks have resolved/);
});
test('provider failures remain visible; identity mismatch and invalid fund NAV are rejected',async()=>{
  const urls=[],fetcher=async url=>{urls.push(url);return new Response(url.includes('get-detailed-info')?JSON.stringify({ACME:{main_info:{symbol:'ACME',currency:'USD',exchange:'NMS',quoteType:'EQUITY',regularMarketTime:Date.parse('2026-11-06T21:00:00Z')/1000,regularMarketPrice:123,longName:'Fictional Co',sector:'Technology',trailingPE:null}}}):'provider down',{status:url.includes('get-detailed-info')?200:503});};
  const result=await fetchDossierEvidence(holding,{fetcher,now:now.getTime()});
  assert.equal(result.annual.length,0);assert.equal(result.technical,null);assert.ok(result.valuation.every(m=>m.value===null));assert.ok(result.gaps.length>=5);
  assert.equal(urls.some(u=>/Private|quantity|costBasis/.test(u)),false);
  await assert.rejects(()=>fetchDossierEvidence({...holding,currency:'INR'},{fetcher,now:now.getTime()}),/Confirm an exact/);
  await assert.rejects(()=>fetchDossierEvidence({...holding,symbol:'123456',exchange:'INMF',assetClass:'mutual_fund',currency:'INR'},{fetcher:async()=>new Response(JSON.stringify({status:'SUCCESS',meta:{scheme_code:123456,scheme_name:'Fictional Fund'},data:[{date:'31-02-2026',nav:'5'}]})),now:now.getTime()}),/NAV date is invalid/);
});
test('server rejects another user’s symbol or unresolved listing before using providers or quota',async()=>{
  const {store,calls}=storeFixture();
  await assert.rejects(()=>runDossier(store,{security:'NYSE:OTHER',now}),/own portfolio/);
  assert.equal(calls.some(c=>c.action==='begin'),false);
  const unconfirmed=storeFixture([{...holding,mapping:'unresolved'}]);
  await assert.rejects(()=>runDossier(unconfirmed.store,{security:'NASDAQ:ACME',now}),/choose its exact listing/);
  assert.equal(unconfirmed.calls.some(c=>c.action==='begin'),false);
});
test('a provider-matched portfolio holding can open its evidence file without manual confirmation',async()=>{
  const {store,state}=storeFixture([{...holding,mapping:'unresolved'}]);
  state.cache['NASDAQ:ACME']=parseYahooQuote({ACME:{main_info:{symbol:'ACME',currency:'USD',exchange:'NMS',quoteType:'EQUITY',longName:'Fictional Co',regularMarketPrice:100,regularMarketTime:now.getTime()/1000-600}}},holding,now.getTime());
  const result=await runDossier(store,{security:'NASDAQ:ACME',mode:'refresh',now},{fetchEvidence:async()=>evidence(),analyze:()=>{throw Error('Evidence refresh must not call AI');}});
  assert.equal(result.status,'complete');assert.equal(state.cache['dossier:NASDAQ:ACME'].evidence.name,'Fictional Co');
  assert.equal(state.document.positions[0].mapping,'unresolved');
});
test('thesis saves without AI; evidence refresh preserves previous reviews; errors leave saved work intact',async()=>{
  const {store,state,calls}=storeFixture(),key='dossier:NASDAQ:ACME';
  state.cache[key]={reports:[{id:'previous',thesis:'Original'}]};
  const input={security:'NASDAQ:ACME',thesis:'Test hypothesis',now};
  await runDossier(store,{...input,mode:'thesis'});assert.equal(state.cache[key].thesis,'Test hypothesis');
  await runDossier(store,{...input,mode:'refresh'},{fetchEvidence:async()=>evidence()});
  assert.equal(state.cache[key].reports[0].id,'previous');
  assert.ok(calls.filter(c=>c.action==='begin').every(c=>c.args.kind==='refresh'));
  const before=structuredClone(state.cache);
  await assert.rejects(()=>runDossier(store,{...input,mode:'refresh'},{fetchEvidence:async()=>{throw Error('Provider down');}}),/Provider down/);
  assert.deepEqual(state.cache[key].evidence,before[key].evidence);assert.deepEqual(state.cache[key].reports,before[key].reports);assert.equal(state.cache[key].lastError,'Provider down');assert.equal(state.runs.at(-1).status,'failed');
});
test('reviews retain their own thesis/evidence; identical recent requests reuse without another paid allowance',async()=>{
  const {store,state,calls}=storeFixture(),key='dossier:NASDAQ:ACME';let paid=0;
  const deps={fetchEvidence:async()=>evidence(),analyze:async input=>{paid++;assert.equal('quantity' in input,false);assert.equal('account' in input,false);return report();}};
  await runDossier(store,{security:'NASDAQ:ACME',thesis:'Thesis one',now},deps);
  const first=structuredClone(state.cache[key].reports[0]),starts=calls.filter(c=>c.action==='begin').length;
  const reused=await runDossier(store,{security:'NASDAQ:ACME',thesis:'Thesis one',now},deps);
  assert.equal(reused.reused,true);assert.equal(paid,1);assert.equal(calls.filter(c=>c.action==='begin').length,starts);
  await runDossier(store,{security:'NASDAQ:ACME',thesis:'Thesis two',now:new Date(now.getTime()+61000)},deps);
  assert.equal(paid,2);assert.equal(state.cache[key].reports.length,2);assert.deepEqual(state.cache[key].reports[1],first);
  assert.equal(state.cache[key].reports[0].thesis,'Thesis two');assert.equal(first.thesis,'Thesis one');
});
test('failed AI or failed persistence is never reported as a completed saved review',async()=>{
  const {store,state}=storeFixture();
  await assert.rejects(()=>runDossier(store,{security:'NASDAQ:ACME',now},{fetchEvidence:async()=>evidence(),analyze:async()=>{throw Error('Invalid AI output');}}),/Invalid AI output/);
  assert.equal(state.cache['dossier:NASDAQ:ACME'].evidence.security,'NASDAQ:ACME');assert.equal(state.cache['dossier:NASDAQ:ACME'].reports,undefined);assert.equal(state.cache['dossier:NASDAQ:ACME'].reviewState,'failed');assert.equal(state.runs[0].status,'failed');
  const badSave=async(action,args)=>{if(action==='cache')throw Error('Save failed');return store(action,args);};
  await assert.rejects(()=>runDossier(badSave,{security:'NASDAQ:ACME',now},{fetchEvidence:async()=>evidence(),analyze:async()=>report()}),/Save failed/);
  assert.equal(state.runs.at(-1).status,'failed');
});
test('report validation rejects unknown evidence, invented links, and absent sections',async()=>{
  const raw=report();assert.equal(validateDossierReport(raw,{},evidence()).business.text,raw.business.text);
  for(const changed of [{...raw,business:{...raw.business,evidenceIds:['invented']}},{...raw,business:{...raw.business,sourceURLs:['https://fake.test']}},{...raw,business:{...raw.business,text:'Visit https://fake.test for evidence'}},{...raw,business:null}])assert.throws(()=>validateDossierReport(changed,{},evidence()));
  let prompt;
  await analyzeDossier(evidence(),{thesis:'Fictional hypothesis',now},{models:{generateContent:async request=>{prompt=request.contents;assert.deepEqual(request.config.responseJsonSchema.properties.business.properties.evidenceIds.items.enum,['profile','gaps']);assert.equal(request.config.responseJsonSchema.properties.business.properties.sourceURLs.items.enum,undefined);return {text:JSON.stringify(raw)};}}});
  assert.match(prompt,/untrusted data/);assert.match(prompt,/Fictional hypothesis/);assert.doesNotMatch(prompt,/Private account/);
});

test('discovery research requires a recent candidate in this account and never adds a holding',async()=>{
 const {store,state,calls}=storeFixture([]);
 await assert.rejects(runDossier(store,{security:'NASDAQ:ACME',discovery:true,now}),/no longer in a recent scan/);
 assert.equal(calls.some(c=>c.action==='begin'),false);
 state.cache['radar:All']={generatedAt:new Date(+now-8*86400000).toISOString(),signals:[{...holding,security:'NASDAQ:ACME'}]};
 await assert.rejects(runDossier(store,{security:'NASDAQ:ACME',discovery:true,now}),/no longer in a recent scan/);
 state.cache['radar:All'].generatedAt=now.toISOString();
 await runDossier(store,{security:'NASDAQ:ACME',discovery:true,mode:'refresh',now},{fetchEvidence:async p=>{assert.equal(p.quantity,undefined);return evidence();}});
 assert.equal(state.cache['dossier:NASDAQ:ACME'].evidence.security,'NASDAQ:ACME');
 assert.deepEqual(state.document.positions,[]);
});

test('challenge answers save without AI, are bound to this account’s latest report and survive evidence refresh',async()=>{
 const {store,state,calls}=storeFixture(),key='dossier:NASDAQ:ACME';
 const input={security:'NASDAQ:ACME',now,thesis:'Original thesis'};
 await runDossier(store,input,{fetchEvidence:async()=>evidence(),analyze:async()=>report()});
 const original=structuredClone(state.cache[key].reports[0]);
 const deps={fetchEvidence:()=>{throw Error('No providers for an answer');},analyze:()=>{throw Error('No AI for an answer');}};
 await runDossier(store,{...input,mode:'reflection',reportId:original.id,answer:'  Check retention cohorts in the annual report.  '},deps);
 assert.deepEqual(state.cache[key].reports[0],original);
 assert.equal(state.cache[key].responses[0].question,original.challenge.question);
 assert.equal(state.cache[key].responses[0].answer,'Check retention cohorts in the annual report.');
 assert.equal(calls.filter(c=>c.action==='begin').at(-1).args.kind,'refresh');
 const starts=calls.filter(c=>c.action==='begin').length;
 for(const fields of [{reportId:'someone-else',answer:'Answer'},{reportId:original.id,answer:''},{reportId:original.id,answer:'a'.repeat(2001)}])await assert.rejects(()=>runDossier(store,{...input,mode:'reflection',...fields},deps));
 assert.equal(calls.filter(c=>c.action==='begin').length,starts);
 await runDossier(store,{...input,mode:'refresh'},{fetchEvidence:async()=>evidence()});
 assert.equal(state.cache[key].responses.length,1);
});

test('a saved answer invalidates review reuse, enters the prompt and is preserved in report history',async()=>{
 const {store,state}=storeFixture(),key='dossier:NASDAQ:ACME',input={security:'NASDAQ:ACME',now}; let paid=0;
 const deps={fetchEvidence:async()=>evidence(),analyze:async(_,context)=>{paid++;if(paid===2)assert.equal(context.responses[0].answer,'Retention evidence needed');return report();}};
 await runDossier(store,input,deps);
 const first=state.cache[key].reports[0].id;
 await runDossier(store,{...input,mode:'reflection',reportId:first,answer:'Retention evidence needed'});
 await runDossier(store,input,deps);
 assert.equal(paid,2);assert.equal(state.cache[key].reports[0].responses[0].reportId,first);
 assert.equal(state.cache[key].reports[1].responses.length,0);
 await runDossier(store,input,deps);assert.equal(paid,2);
 await assert.rejects(()=>runDossier(store,{...input,mode:'reflection',reportId:first,answer:'Old question'}),/older/);
 let prompt;
 await analyzeDossier(evidence(),{responses:state.cache[key].responses,now},{models:{generateContent:async request=>{prompt=request.contents;return {text:JSON.stringify(report())};}}});
 assert.match(prompt,/Retention evidence needed/);assert.match(prompt,/untrusted user hypotheses/);assert.match(prompt,/historical backtest/);
});

test('challenge claims require traceable evidence and legacy reports remain readable, not accepted as new output',()=>{
 for(const change of [undefined,{...report().challenge,question:''},{...report().challenge,question:'a'.repeat(601)},{...report().challenge,alternative:{text:'Invented claim',evidenceIds:['invented'],sourceURLs:[]}}])assert.throws(()=>validateDossierReport({...report(),challenge:change},{},evidence()));
});

test('a concurrent newer review cannot accept an answer to the old question',async()=>{
 const {store,state}=storeFixture(),key='dossier:NASDAQ:ACME';
 state.cache[key]={reports:[{...report(),id:'old'}]};
 const changed=async(action,args)=>{const result=await store(action,args);if(action==='begin')state.cache[key].reports[0].id='new';return result;};
 await assert.rejects(()=>runDossier(changed,{security:'NASDAQ:ACME',mode:'reflection',reportId:'old',answer:'Must not save',now}),/older/);
 assert.equal(state.cache[key].responses,undefined);assert.equal(state.cache[key].reviewState,undefined);
});

test('a partial provider refresh cannot erase the last verified quarterly statement or its date',async()=>{
  const {store,state}=storeFixture(), security='NASDAQ:ACME',key='dossier:'+security;
  const previous={...evidence(),fetchedAt:'2026-11-08T08:00:00Z',quarterly:[{date:'2026-09-30',revenue:100}]};
  state.cache[key]={evidence:previous,reports:[]};
  await assert.rejects(runDossier(store,{security,mode:'refresh',now},{fetchEvidence:async()=>evidence()}),/last verified evidence/);
  assert.deepEqual(state.cache[key].evidence,previous);
});

test('the current published audit accepts a challenge response without rewriting an older review',async()=>{
  const {store,state}=storeFixture(),security='NASDAQ:ACME',key='dossier:'+security;
  state.cache[key]={reports:[{id:'older',createdAt:'2026-10-01'}],evidence:evidence()};
  state.cache['coverage-review:'+security]={...report(),id:'newer',createdAt:'2026-11-01'};
  await runDossier(store,{security,mode:'reflection',reportId:'newer',answer:'Look for recurring revenue.',now});
  assert.equal(state.cache[key].responses[0].reportId,'newer');assert.equal(state.cache[key].reports[0].id,'older');
});

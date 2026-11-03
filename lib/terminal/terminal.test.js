import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePosition, normalizeState, importPreview, convert, valuePortfolio, instrumentId } from './domain.js';
import { validateBars, indicators, compareHistory } from './indicators.js';
import { fetchInstrument, importHistory, keepLastValid } from './feeds.js';
import { parseNews, dedupNews } from './news.js';
import { publicResearchContext, validateResearch, researchUsage, eventAlerts, runResearch } from './research.js';
import { scan, scheduledWindow } from './scan.js';
const now = Date.parse('2026-11-03T12:00:00Z');
const pos = overrides => normalizePosition({name:'Example',symbol:'EXAMPLE',exchange:'NASDAQ',currency:'USD',assetClass:'equity',quantity:'1.123456789012345678',mapping:'confirmed',...overrides});
const quote = (price=100,asOf='2026-11-02T20:00:00Z') => ({quote:{price,currency:'USD',asOf,quality:'imported EOD'}});
const bars = (n=220) => validateBars(Array.from({length:n},(_,i)=>({date:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),open:100+i,high:101+i,low:99+i,close:100+i,volume:100})), 'split-adjusted');
test('position quantities stay exact; mapping, product and duplicate rules protect imports',()=>{
  assert.equal(pos().quantity,'1.123456789012345678');
  assert.throws(()=>pos({symbol:'PARKIN',exchange:'ADX',currency:'AED'}),/DFM/);
  assert.throws(()=>pos({symbol:'VOO',exchange:'NYSEARCA'}),/ETF/);
  assert.throws(()=>pos({symbol:'GOLD',exchange:'BROKER',assetClass:'metal'}),/product/);
  assert.throws(()=>pos({quantity:'1e6'}),/decimal/);
  const csv='name,symbol,exchange,currency,quantity,costBasis,account,lot\n"Example, Inc",EXAMPLE,NASDAQ,USD,2,,A,1\nExample,EXAMPLE,NASDAQ,USD,2,,A,1\nExample,EXAMPLE,NASDAQ,USD,3,,A,1\nExample,EXAMPLE,NASDAQ,USD,2,,B,1';
  const p=importPreview(csv); assert.deepEqual(p.map(r=>r.status),['ready','duplicate','conflict','ready']);assert.equal(p[0].position.costBasis,null);assert.equal(p[0].position.mapping,'unresolved');
  assert.throws(()=>normalizeState({positions:[pos({id:'duplicate'}),pos({id:'duplicate'})]}),/unique/);
});
test('valuation excludes stale/unresolved values; FX and missing cost remain unknown',()=>{
  const a=pos({quantity:'2',costBasis:'150'}), b=pos({symbol:'OTHER',quantity:'4'}),c=pos({symbol:'BAD',mapping:'unresolved'});
  const data={[instrumentId(a)]:quote(),[instrumentId(b)]:quote(10,'2026-10-01T00:00:00Z'),[instrumentId(c)]:quote()};
  const fx={rates:{USD:1,AED:3.67,INR:84},asOf:'2026-11-03T00:00:00Z'};
  const r=valuePortfolio([a,b,c],data,fx,'AED',now);assert.equal(r.priced,1);assert.equal(r.total,734);assert.equal(r.pnl,183.5);assert.equal(r.concentration,1);
  assert.equal(convert(10,'USD','AED',{...fx,asOf:'invalid'},now),null);assert.equal(convert(10,'USD','AED',{...fx,asOf:'2020-01-01'},now),null);
  assert.equal(valuePortfolio([pos({quantity:'2'})],data,null,'USD',now).pnl,null);
  assert.equal(valuePortfolio([a],{},fx,'AED',now).total,null);
});
test('adjustment basis and common dates govern indicators, splits and comparisons',()=>{
  const h=bars();const result=indicators(h);assert.equal(result.sma20,309.5);assert.equal(result.sma200,219.5);assert.equal(result.rsi14,100);assert.equal(result.relativeVolume,1);
  assert.equal(indicators({...h,adjustment:'unknown'}).sma20,null);
  assert.equal(indicators(bars(14)).rsi14,null);
  const flat=validateBars(h.bars.map(b=>({...b,open:100,high:100,low:100,close:100})), 'split-adjusted');assert.equal(indicators(flat).rsi14,50);
  const other={...h,bars:h.bars.filter((_,i)=>i%2===0)};const c=compareHistory(h,other,20);assert.equal(c.length,20);assert.equal(c[0].security,0);assert.equal(c.at(-1).security,c.at(-1).benchmark);
  assert.throws(()=>validateBars([h.bars[0],h.bars[0]]),/unique/);
  assert.throws(()=>validateBars([{...h.bars[0],high:1}]),/OHLC/);
});
test('provider failures retain data; unsupported securities make no external request',async()=>{
  let called=false;const missing=await fetchInstrument(pos(),{personalFeed:true,fetcher:()=>{called=true;}});assert.match(missing.unavailable,/No licensed/);assert.equal(called,false);
  const old=quote();const retained=keepLastValid(old,null,'Provider unavailable',now);assert.equal(retained.quote.price,100);assert.equal(retained.consecutiveFailures,1);
  assert.equal(keepLastValid(old,quote(2,'2026-10-01T00:00:00Z'),null,now).quote.price,100);
  assert.throws(()=>importHistory('date,open,high,low,close,volume\n2026-11-03,1,2,1,2,1',pos(),{source:'https://example.com',adjustment:'unknown',asOf:'2026-11-03T00:00:00Z'},now),/completed/);
});
test('RSS filters future and stale items, rejects entities and deduplicates publishers',()=>{
  const item=(date,title='Issuer update',url='https://example.com/news')=>`<item><title>${title} - Publisher</title><link>${url}</link><pubDate>${date}</pubDate><source>Publisher</source></item>`;
  const list=parseNews(`<rss><channel>${item('2026-11-03T08:00:00Z')}${item('2030-01-01')}${item('2020-01-01')}</channel></rss>`,{market:'India',topic:'Markets'},now);assert.equal(list.length,1);assert.equal(list[0].title,'Issuer update');assert.equal(dedupNews([...list,{...list[0],url:'https://other.example/news'}]).length,1);
  assert.throws(()=>parseNews('<!DOCTYPE rss><rss/>',{},now),/Unsupported/);
});
test('AI context omits accounts, quantities and restricted feeds; evidence is validated',()=>{
  const p=pos({account:'SECRET_ACCOUNT',quantity:'1234.56789',costBasis:'87654'});const context=JSON.stringify(publicResearchContext([p],{[instrumentId(p)]:{...quote(),restrictedToPersonalUse:true}}));assert.ok(!context.includes('SECRET_ACCOUNT'));assert.ok(!context.includes('1234.56789'));assert.ok(!context.includes('87654'));assert.equal(JSON.parse(context)[0].quote,null);
  const raw={summary:'Analysis',gaps:[],assessments:[{symbol:p.symbol,exchange:p.exchange,facts:[{claim:'Claim',url:'https://evil.example',publishedAt:''}]}],news:[{title:'Verified source',url:'https://example.com/filing',publishedAt:'2026-11-03T08:00:00Z',securities:[instrumentId(p)],material:true,impact:'Inference'},{title:'Invented',url:'https://invented.example'}]};
  const response={candidates:[{groundingMetadata:{groundingChunks:[{web:{uri:'https://example.com/filing',title:'Filing'}}]}}]};
  const r=validateResearch(raw,response,[p]);assert.equal(r.news.length,1);assert.equal(r.assessments[0].facts[0].supported,false);assert.equal(eventAlerts(r,[p],now).length,1);assert.equal(validateResearch(raw,response,[p],'ideas').assessments.length,0);
  assert.equal(researchUsage({usageMetadata:{promptTokenCount:1000,candidatesTokenCount:100,thoughtsTokenCount:20}},'gemini-3.6-flash',new Date(now)).tokenCostEstimateUSD,.0012);
});
test('quota and billing failures are readable and do not publish fake research',async()=>{
  let calls=0;const client={models:{generateContent:async()=>{calls++;throw {status:402};}}};
  await assert.rejects(runResearch({kind:'brief',market:'India',positions:[],cache:{},settings:{}},client),/prepaid credits/);assert.equal(calls,1);
});
test('scan is idempotent and isolates partial provider/research failures',async()=>{
  const p=pos(),state={document:{positions:[p],watchlist:[pos({symbol:'WATCH'})],settings:{}},cache:{},runs:[]};const writes=[];
  const store=async(action,args)=>{writes.push([action,args]);if(action==='begin')return {id:'test',lease:'test'};if(action==='load')return state;};
  const result=await scan(store,{kind:'brief',now:new Date(now)}, {fetchFX:async()=>{throw Error('FX unavailable')},fetchNews:async()=>({items:[],failures:[]}),fetchInstrument:async()=>{throw Error('Price unavailable')},runResearch:async()=>{throw Error('Research unavailable')}});
  assert.equal(result.status,'partial');assert.ok(result.result.errors.includes('Research unavailable')||result.result.errors.some(x=>x.endsWith('Research unavailable')));assert.ok(writes.some(([a,b])=>a==='cache'&&b.key==='NASDAQ:WATCH'));assert.equal(writes.at(-1)[0],'finish');
  let loaded=false;const existing=await scan(async action=>{if(action==='begin')return{existing:true,status:'complete'};loaded=true;});assert.equal(existing.existing,true);assert.equal(loaded,false);
  assert.equal(scheduledWindow('asia',new Date('2026-11-03T06:30:00Z')),'scheduled:asia:2026-11-03');assert.throws(()=>scheduledWindow('global',new Date(now)),/Outside/);
});

test('daily technical alerts require known adjustment and a real threshold crossing',async()=>{
  const {technicalObservations}=await import('./indicators.js');
  const h=validateBars(bars(51).bars.map((b,i)=>({...b,open:i===50?150:100,close:i===50?150:100,high:i===50?151:101,low:99,volume:i===50?300:100})),'split-adjusted');
  assert.deepEqual(technicalObservations(h).map(o=>o.code),['sma20-above-50','rsi-above-70','volume-2x']);
  assert.deepEqual(technicalObservations({...h,adjustment:'unknown'}),[]);
});

test('OpenAI adapter retains returned evidence and usage without storing the response',async()=>{
  const {openaiResearchClient}=await import('./openaiResearch.js');let request;
  const client={responses:{create:async r=>{request=r;return {status:'completed',model:'fixture',output_text:'{}',usage:{input_tokens:10,output_tokens:5},output:[{type:'web_search_call',action:{query:'public news',sources:[{url:'https://example.com/filing'}]}}]};}}};
  const result=await openaiResearchClient(client).models.generateContent({contents:'Public test',config:{responseJsonSchema:{type:'object',properties:{summary:{type:'string'}},required:['summary']}}});
  assert.equal(request.store,false);assert.equal(request.tool_choice,'required');assert.equal(request.text.format.schema.additionalProperties,false);assert.equal(result.terminalUsage.provider,'OpenAI');assert.equal(result.terminalUsage.total,null);assert.equal(result.candidates[0].groundingMetadata.groundingChunks[0].web.uri,'https://example.com/filing');
});

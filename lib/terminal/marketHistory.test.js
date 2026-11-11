import test from 'node:test';
import assert from 'node:assert/strict';
import { adjustedSeries, fetchMarketHistory } from './marketHistory.js';
import { parseNseDay } from './nseCloses.js';
import { bestSeries } from './seriesCache.js';
import { indicators, compareHistory } from './indicators.js';
import { reviewShelf } from './reviewShelf.js';
const now=Date.parse('2026-11-11T09:00:00Z');
test('history uses exact listing and completed sessions; unavailable volume is not zero',()=>{
 const prices=Object.fromEntries([['2026-11-06',{'AAPL':11}],['2026-11-08',{'AAPL':12}],['2026-11-09',{X:100}],['2026-11-11',{'AAPL':16}]]);
 const h=adjustedSeries(prices,{'2026-11-06':{AAPL:{Volume:0}}},'AAPL',now);
 assert.deepEqual(h.bars.map(r=>[r.date,r.close,r.volume]),[['2026-11-06',11,0],['2026-11-08',12,null]]);
 assert.throws(()=>adjustedSeries(prices,{},'X',now));assert.deepEqual(compareHistory(h,{...h,adjustment:'split-adjusted'}),[]);
});
test('US listing fetches adjusted closes and keeps the chart when the separate volume feed fails',async()=>{
 const prices={'2026-11-06':{AAPL:99},'2026-11-09':{AAPL:101}};
 const h=await fetchMarketHistory({symbol:'AAPL',exchange:'NASDAQ',currency:'USD',assetClass:'equity'},{now,fetcher:async u=>new Response(u.includes('get-adj-close')?JSON.stringify(prices):'',{status:u.includes('get-adj-close')?200:503})});
 assert.equal(h.bars.length,2);assert.equal(h.bars.at(-1).close,101);assert.equal(h.bars.at(-1).volume,null);
});
test('archive excludes another instrument, series, and dates; raw closes cannot imply adjusted signals',()=>{
 const rows=parseNseDay('SYMBOL,SERIES,DATE1,CLOSE_PRICE,TTL_TRD_QNTY\nJPL,EQ,09-Nov-2026,30,100\nJPL,BE,09-Nov-2026,2,400\nJPL,EQ,08-Nov-2026,5,201','2026-11-09');assert.deepEqual(rows.get('JPL'),{date:'2026-11-09',close:30,volume:100});assert.equal(rows.get('JIOFIN'),undefined);
 assert.equal(indicators({adjustment:'unknown',bars:Array(250).fill(rows.get('JPL'))}).sma200,null);
});
test('latest actual trading date wins, equally dated adjusted series beats raw, authored versions retain history',()=>{
 const a={bars:[{date:'2026-11-09'}],adjustment:'unknown'},b={...a,adjustment:'dividend-and-split-adjusted'},older={...b,bars:[{date:'2026-11-06'}]};
 assert.equal(bestSeries(a,older),a);assert.equal(bestSeries(a,b),b);assert.equal(bestSeries(null),null);
 assert.deepEqual(reviewShelf({reports:[{id:'b',createdAt:'2026-12'},{id:'a',createdAt:'2026-10'}]},{id:'audit',createdAt:'2026-11'}).map(r=>r.id),['b','audit','a']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createQuoteFeed, parseSpot, parseIndex, parseSensex, parseFX } from './quote-feed.js';
import { QUOTE_MARKETS, mergeQuotes, validQuote, quoteIsOld, quoteTimestamp } from './quotes.js';
const now=Date.parse('2026-11-04T06:30:00Z');
const spot=(id,stamp=now)=>({symbol:id,currency:'USD',price:100,updatedAt:new Date(stamp).toISOString()});
const index={symbol:'nasdaq',currency:'USD',interval:'5m',points:[{t:(now-3600000)/1000,c:20000},{t:(now-60000)/1000,c:21000}],data_state:{status:'fresh'}};
const sensex={ids:['^BSESN'],data:[{date:'2026-11-02','^BSESN':75000},{date:'2026-11-03','^BSESN':76500}],meta:{unknown_ids:[],empty_ids:[]}};
const fx={result:'success',base_code:'AED',time_last_update_unix:now/1000,rates:{INR:25.8}};

test('quote parsers preserve source times, units and instrument identity',()=>{
  assert.deepEqual(parseSpot(spot('XAG'),'XAG',now),{id:'XAG',price:100,asOf:new Date(now).toISOString()});
  assert.equal(parseIndex(index,'NASDAQ','nasdaq',now).price,21000);
  const close=parseSensex(sensex,now);assert.equal(close.price,76500);assert.ok(Math.abs(close.changePercent-2)<1e-10);
  assert.equal(quoteTimestamp(close,QUOTE_MARKETS[0]),'3 Nov');
  assert.equal(parseFX(fx,now).price,25.8);
  assert.equal(QUOTE_MARKETS.some(m=>['SP500','ETH'].includes(m.id)),false);
});
test('reject wrong currencies, missing prices, zero, invalid timestamps and over-age quotes',()=>{
  for(const patch of [{price:null},{price:0},{price:'100'},{currency:'AED'},{symbol:'BTC'},{updatedAt:'invalid'},{updatedAt:new Date(now+600000).toISOString()},{updatedAt:new Date(now-2*86400000).toISOString()}])assert.throws(()=>parseSpot({...spot('XAU'),...patch},'XAU',now));
  assert.throws(()=>parseFX({...fx,base_code:'USD'},now));
  assert.throws(()=>parseFX({...fx,rates:{INR:null}},now));
  assert.throws(()=>parseIndex({...index,symbol:'sp500'},'NASDAQ','nasdaq',now));
  assert.throws(()=>parseIndex({...index,points:[]},'NASDAQ','nasdaq',now));
  assert.throws(()=>parseSensex({...sensex,data:[{date:'2026-11-05','^BSESN':80000}]},now));
});
test('retain a last known price across failures without rejuvenating its observation time',()=>{
  const prior=parseSpot(spot('XAU'),'XAU',now);
  const saved=mergeQuotes([prior],[{id:'XAU',price:null}],now+60000).find(q=>q.id==='XAU');
  assert.equal(saved.price,100);assert.equal(saved.asOf,prior.asOf);assert.equal(saved.updateFailed,true);assert.equal(saved.stale,true);
  assert.equal(mergeQuotes([prior],[null],now+2*86400000).find(q=>q.id==='XAU').price,null);
  const older=parseSpot(spot('XAU',now-60000),'XAU',now);
  assert.equal(mergeQuotes([prior],[older],now).find(q=>q.id==='XAU').asOf,prior.asOf);
  assert.equal(validQuote(prior,'BTC',now),false);
  assert.equal(quoteIsOld(prior,QUOTE_MARKETS.find(m=>m.id==='XAU'),now+6*60000),true);
});
test('independent requests, coalescing and provider caching survive partial and total outages',async()=>{
  let time=now,fail=false,calls=[];
  const fetcher=async url=>{
    calls.push(url);await new Promise(resolve=>setTimeout(resolve,5));
    if(fail)throw Error('Provider unreachable');
    const data=url.includes('tigzig')?sensex:url.includes('xaus')?index:url.includes('er-api')?fx:spot(url.split('/').at(-1));
    return {ok:true,json:async()=>data};
  };
  const get=createQuoteFeed({fetcher,clock:()=>time});
  const [first,second]=await Promise.all([get(),get()]);assert.equal(calls.length,6);assert.deepEqual(first,second);assert.equal(first.quotes.filter(q=>q.price>0).length,6);
  time+=61000;fail=true;
  const partial=await get();assert.equal(calls.length,9); // Only three spot feeds expire at 60s.
  assert.equal(partial.quotes.find(q=>q.id==='XAG').updateFailed,true);assert.equal(partial.quotes.find(q=>q.id==='NASDAQ').updateFailed,false);
  assert.equal(partial.quotes.find(q=>q.id==='XAG').asOf,new Date(now).toISOString());
  time+=8*86400000;
  const expired=await get();assert.ok(expired.quotes.every(q=>q.price===null));
});

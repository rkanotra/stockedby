import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchPrices} from './prices.js';
import {quoteLabel,quoteStamp} from './quoteDisplay.js';
import {holdingDecision} from './reviewShelf.js';

const morning=Date.parse('2026-11-11T06:00:00Z'),evening=Date.parse('2026-11-11T12:00:00Z');
const holding=symbol=>({symbol,exchange:'NSE',currency:'INR',assetClass:'equity'});
const stock=holding('SHAKTIPUMP'), other=holding('RATEGAIN');
const stamp='2026-11-11T09:59:00Z';
const quote={price:396.45,asOf:stamp,quality:'delayed'};
const csv='SYMBOL, SERIES, DATE1, LAST_PRICE, CLOSE_PRICE, TTL_TRD_QNTY\nSHAKTIPUMP, EQ, 11-Nov-2026,396.45,399.10,800\nRATEGAIN,EQ,11-Nov-2026,682.30,686.95,200\nSHAKTIPUMP,BE,11-Nov-2026,11,11,300';
const yahoo=p=>({symbol:p.symbol+'.NS',exchange:'NSI',currency:'INR',quoteType:'EQUITY',longName:p.symbol,regularMarketPrice:396.45,regularMarketTime:Date.parse(stamp)/1000});
test('NSE closes use the published date, symbol, EQ series and CLOSE_PRICE, once per batch',async()=>{
  const requests=[];
  const fetcher=async url=>{
    requests.push(url);
    return url.endsWith('.csv')?{ok:true,text:async()=>csv}:{ok:true,json:async()=>Object.fromEntries([stock,other].map(p=>[p.symbol+'.NS',{main_info:yahoo(p)}]))};
  };
  const prices=await fetchPrices([stock,other],{fetcher,now:evening,useCache:false});
  assert.equal(requests.filter(u=>u.endsWith('.csv')).length,1);
  const data=prices['NSE:SHAKTIPUMP'];
  assert.equal(data.quote.price,399.10); assert.equal(prices['NSE:RATEGAIN'].quote.price,686.95);
  assert.match(data.source,/archives.nseindia.com.*11112026.csv$/);
  assert.equal(quoteLabel(stock,data.quote,data.quote.quality,evening),'Market closed · official close');
  assert.equal(quoteStamp(stock,data.quote),'11 Nov 2026');
  assert.equal(quoteLabel(stock,data.quote,'stale',evening),'stale');
});
test('unpublished or mismatched closing files retain the timestamped trade rather than promoting it to a close', async()=>{
  for(const response of [{ok:false,status:404},{ok:true,text:async()=>csv.replaceAll('11-Nov','10-Nov')}]){
    const data=(await fetchPrices([stock],{now:evening,useCache:false,fetcher:async url=>url.endsWith('.csv')?response:{ok:true,json:async()=>({'SHAKTIPUMP.NS':{main_info:yahoo(stock)}})}}))['NSE:SHAKTIPUMP'];
    assert.equal(data.quote.quality,'delayed');assert.equal(data.quote.price,396.45);
    assert.equal(quoteLabel(stock,data.quote,'delayed',evening),'Market closed · last quote');
    assert.match(quoteStamp(stock,data.quote),/15:29 IST/);
  }
  assert.equal(quoteLabel(stock,{...quote,asOf:'2026-11-11T05:55:00Z'},'delayed',morning),'Regular session · delayed');
  assert.equal(quoteLabel(stock,{...quote,asOf:'2026-11-09T10:00:00Z'},'delayed',morning),'Previous session quote');
  assert.equal(quoteLabel(stock,quote,'unresolved',evening),'unresolved');
});
test('never substitutes NSE closes for mismatched listings or BSE',async()=>{
  const q={...stock,exchange:'BSE'},urls=[];
  const out=await fetchPrices([stock,q],{now:evening,useCache:false,fetcher:async url=>{
    urls.push(url); return {ok:true,json:async()=>({'SHAKTIPUMP.NS':{main_info:{...yahoo(stock),currency:'USD'}},'SHAKTIPUMP.BO':{main_info:{...yahoo(stock),symbol:'SHAKTIPUMP.BO',exchange:'BSE'}}})};
  }});
  assert.equal(urls.length,1);assert.ok(out['NSE:SHAKTIPUMP'].unavailable);assert.equal(out['BSE:SHAKTIPUMP'].quote.quality,'delayed');
});
test('portfolio summary uses the newest decision on the same listing, independent of P&L or other listings',()=>{
  const report=(stance,date)=>({createdAt:date,evidenceAt:date,decision:{stance,confidence:'Moderate',text:'A dated reason.'}});
  const cache={'dossier:NSE:X':{reports:[report('Buy','2026-11-01')],evidence:{fetchedAt:'2026-11-11'}},'coverage-review:NSE:X':report('Wait','2026-11-10'),'dossier:NYSE:X':{reports:[report('Sell','2026-11-02')]}};
  assert.deepEqual(holdingDecision(cache,'NSE:X'),{stance:'Wait',confidence:'Moderate',reason:'A dated reason.',date:'2026-11-10',changed:true});
  assert.equal(holdingDecision(cache,'NYSE:X').stance,'Sell');
  assert.equal(holdingDecision(cache,'NASDAQ:X'),null);
  cache['dossier:NSE:X'].reports.unshift(report('Hold','2026-11-12'));
  assert.equal(holdingDecision(cache,'NSE:X').stance,'Hold');
});

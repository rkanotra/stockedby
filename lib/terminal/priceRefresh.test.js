import test from 'node:test';
import assert from 'node:assert/strict';
import { refreshPortfolioPrices, mergePriceRefresh } from './priceRefresh.js';

test('quotes render in small batches and a failed batch does not block the next holdings',async()=>{
  const seen=[],progress=[],requests=[];
  const error=await refreshPortfolioPrices(Array.from({length:12},(_,n)=>({symbol:String(n)})),{
    persist:true,onPrices:p=>seen.push(p),onProgress:n=>progress.push(n),fetcher:async(url,options)=>{
      const body=JSON.parse(options.body);requests.push(body);
      if(requests.length===2)throw Error('Provider unreachable');
      return new Response(JSON.stringify({prices:{[body.instruments[0].symbol]:{quote:{price:100}}}}));
    },
  });
  assert.deepEqual(requests.map(r=>r.instruments.length),[5,5,2]);
  assert.deepEqual(seen.map(p=>Object.keys(p)[0]),['0','10']);assert.deepEqual(progress,[5,10,12]);
  assert.equal(error,'Provider unreachable');assert.ok(requests.every(r=>r.persist));
});
test('a timed-out request ends with a retry message; authentication failures stop further requests',async()=>{
  const result=await refreshPortfolioPrices([{}],{onPrices:()=>assert.fail(),fetcher:async()=>{throw new DOMException('timeout','TimeoutError');}});
  assert.match(result,/timed out/);
  let calls=0;await refreshPortfolioPrices(Array(12).fill({}),{onPrices:()=>assert.fail(),fetcher:async()=>{calls++;return new Response(JSON.stringify({error:'Sign in again'}),{status:401});}});
  assert.equal(calls,1);
});
test('cancelled refresh never updates a newly selected or closed portfolio',async()=>{
  const controller=new AbortController();let calls=0;
  await refreshPortfolioPrices(Array(12).fill({}),{signal:controller.signal,onPrices:()=>assert.fail(),onProgress:()=>assert.fail(),fetcher:async()=>{calls++;controller.abort();return new Response(JSON.stringify({prices:{X:{}}}));}});
  assert.equal(calls,1);
});
test('failed/older refreshes retain dated valid prices and recovered prices replace the error',()=>{
  const old={quote:{price:100,asOf:'2026-11-09T10:00:00Z'},listingVerified:true};
  const retained=mergePriceRefresh({X:old},{X:{unavailable:'Busy'}});
  assert.equal(retained.X.quote.price,100);assert.equal(retained.X.quote.asOf,old.quote.asOf);assert.equal(retained.X.lastError,'Busy');
  assert.equal(mergePriceRefresh({X:old},{X:{quote:{price:99,asOf:'2026-11-09T09:00:00Z'}}}).X.quote.price,100);
  const recovered={...old,quote:{price:101,asOf:'2026-11-09T10:05:00Z'}};
  assert.deepEqual(mergePriceRefresh(retained,{X:recovered}).X,recovered);
});

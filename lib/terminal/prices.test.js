import test from 'node:test';
import assert from 'node:assert/strict';
import { priceIdentity, providerSymbol, parseYahooQuote, parseFundQuote, fetchPrices, currentValue, findListings } from './prices.js';
import { instrumentId, valuePortfolio, hasVerifiedListing, isListingResolved } from './domain.js';
import { keepLastValid, fetchInstrument } from './feeds.js';

const now = Date.parse('2026-11-09T10:00:00Z');
const stock = { symbol:'AAPL', exchange:'NASDAQ', currency:'USD', assetClass:'equity', quantity:'2.123456789012345678', mapping:'confirmed' };
const fund = { symbol:'125497', exchange:'INMF', currency:'INR', assetClass:'mutual_fund', quantity:'12.345678', mapping:'confirmed' };
const yahoo = (p=stock, changes={}) => ({ [providerSymbol(p)]: { main_info: { symbol:providerSymbol(p),currency:p.currency,quoteType:'EQUITY',exchange:'NMS',longName:'Fictional test issuer',regularMarketPrice:100,regularMarketTime:now/1000-600,...changes } } });
const nav = (changes={}) => ({status:'SUCCESS',meta:{scheme_code:125497,scheme_name:'Fictional Direct Growth'},data:[{date:'06-11-2026',nav:'200.1234'}],...changes});

test('quote identities strip private fields and never guess an unresolved exchange',()=>{
  assert.deepEqual(priceIdentity({...stock,account:'Private account',snapshotValue:'120',source:'private.png'}),{symbol:'AAPL',exchange:'NASDAQ',currency:'USD',assetClass:'equity'});
  for(const p of [{...stock,exchange:'UNRESOLVED'},{...stock,currency:'INR'},{...fund,symbol:'INF200K01T51'},{...stock,symbol:'../../secret'},{...stock,exchange:'NSE',currency:'INR',symbol:'RELIANCE.BO'}]) assert.equal(priceIdentity(p),null);
  assert.equal(providerSymbol({...stock,exchange:'NSE',symbol:'RELIANCE'}),'RELIANCE.NS');
  assert.equal(providerSymbol({...stock,exchange:'BSE',symbol:'500325.BO'}),'500325.BO');
});
test('latest price times quantity is calculated; uploaded value is never used',()=>{
  const data=parseYahooQuote(yahoo(),stock,now);
  assert.equal(data.quote.quality,'delayed');
  assert.equal(currentValue({...stock,snapshotValue:'999999'},data,now),Number(stock.quantity)*100);
  assert.equal(currentValue({...stock,quantity:'3.5'},data,now),350);
  assert.equal(currentValue({...stock,quantity:''},data,now),null);
  assert.equal(currentValue({...stock,quantity:'3',currency:'INR'},data,now),null);
  assert.equal(currentValue({...stock,symbol:'MSFT'},data,now),null);
  assert.equal(currentValue({...stock,assetClass:'etf'},data,now),null);
});
test('an imported exact listing is priced automatically without rewriting holdings or using snapshots',()=>{
  const p={...stock,mapping:'unresolved',name:'AAPL',quantity:'3',costBasis:'240',snapshotValue:'9000'};
  const data=parseYahooQuote(yahoo(),p,now), portfolio=valuePortfolio([p],{[instrumentId(p)]:data},null,'USD',now);
  assert.equal(portfolio.priced,1);assert.equal(portfolio.total,300);assert.equal(portfolio.pnl,60);
  assert.equal(portfolio.rows[0].automaticallyMatched,true);assert.equal(portfolio.rows[0].listingName,'Fictional test issuer');
  assert.equal(p.mapping,'unresolved');assert.equal(p.quantity,'3');
  assert.equal(valuePortfolio([p],{[instrumentId(p)]:data},null,'USD',now+97*3600000).total,null);
});
test('automatic matching cannot cross ticker, exchange, currency, asset type, or fund plan',()=>{
  const p={...stock,mapping:'unresolved'}, data=parseYahooQuote(yahoo(),p,now);
  for(const invalid of [{...data,listingVerified:false},{...data,ownerSupplied:true},{...data,instrumentId:'NASDAQ:MSFT'},{...data,exchange:'NYSE'},{...data,currency:'INR'},{...data,assetClass:'etf'},{...data,name:''}]) {
    assert.equal(hasVerifiedListing(p,invalid),false);
    assert.equal(valuePortfolio([p],{[instrumentId(p)]:invalid},null,'USD',now).total,null);
  }
  assert.equal(isListingResolved({...p,exchange:'UNRESOLVED'},data),false);
  assert.equal(isListingResolved({...fund,mapping:'unresolved'},{...parseFundQuote(nav(),fund,now),listingVerified:true}),false);
});
test('scheduled price fetch also resolves exact uploaded stock identities without a manual checkbox',async()=>{
  const p={...stock,symbol:'AUTO',mapping:'unresolved'};
  const data=await fetchInstrument(p,{now,fetcher:async()=>({ok:true,json:async()=>yahoo(p)})});
  assert.equal(hasVerifiedListing(p,data),true);assert.equal(data.quote.price,100);
});
test('quote parser refuses mismatched, future, stale, invalid and untimestamped prices',()=>{
  for(const changes of [{symbol:'MSFT'},{currency:'INR'},{exchange:'NYQ'},{quoteType:'ETF'},{regularMarketPrice:null},{regularMarketPrice:Infinity},{regularMarketTime:null},{regularMarketTime:now/1000+600},{regularMarketTime:now/1000-97*3600}]) assert.throws(()=>parseYahooQuote(yahoo(stock,changes),stock,now));
  const usFund={...stock,symbol:'VFIAX',exchange:'USMF',assetClass:'mutual_fund'};
  assert.equal(parseYahooQuote(yahoo(usFund,{exchange:'NAS',quoteType:'MUTUALFUND'}),usFund,now).quote.quality,'daily NAV');
});
test('daily fund NAV is matched by scheme and carries its actual valuation date',()=>{
  const data=parseFundQuote(nav(),fund,now);
  assert.equal(data.quote.asOf,'2026-11-06T00:00:00.000Z');
  assert.equal(data.quote.quality,'daily NAV');
  assert.equal(currentValue(fund,data,now),Number(fund.quantity)*200.1234);
  assert.throws(()=>parseFundQuote(nav({meta:{scheme_code:125498,scheme_name:'Other'}}),fund,now));
  for(const date of ['31-02-2026','11-11-2026','01-10-2026','yesterday']) assert.throws(()=>parseFundQuote(nav({data:[{date,nav:'20'}]}),fund,now));
});
test('listing lookup separates markets and lets the user choose the exact fund plan',async()=>{
  const fetcher=async()=>({ok:true,json:async()=>({results:[{symbol:'TEST',name:'US issuer',exchange:'NMS',quoteType:'EQUITY'},{symbol:'TEST.NS',name:'India issuer',exchange:'NSI',quoteType:'EQUITY'},{symbol:'ETF',name:'Wrong type',exchange:'PCX',quoteType:'ETF'}]})});
  const listings=await findListings({query:'test',currency:'INR',assetClass:'equity'},fetcher);
  assert.deepEqual(listings.map(p=>p.symbol),['TEST.NS']);
  const funds=await findListings({query:'fictional',currency:'INR',assetClass:'mutual_fund'},async()=>({ok:true,json:async()=>[{schemeCode:123456,schemeName:'Fictional Direct Growth'},{schemeCode:123457,schemeName:'Fictional Regular Growth'}]}));
  assert.equal(funds.length,2);assert.equal(funds[0].symbol,'123456');assert.equal(funds[1].symbol,'123457');
  await assert.rejects(findListings({query:'x',currency:'INR',assetClass:'equity'},fetcher),/Enter a company/);
});
test('batch fetch sends only identifiers, isolates missing tickers and caches requests',async()=>{
  let calls=0;
  const second={...stock,symbol:'MISSING'}, fetcher=async(url,options)=>{
    calls++;assert.equal(options.method,undefined);assert.ok(!url.includes('quantity'));assert.ok(url.includes('AAPL%2CMISSING'));
    return {ok:true,json:async()=>yahoo()};
  };
  const prices=await fetchPrices([stock,stock,second],{fetcher,now});
  assert.equal(calls,1);assert.equal(prices['NASDAQ:AAPL'].quote.price,100);assert.match(prices['NASDAQ:MISSING'].unavailable,/does not match/);
  await fetchPrices([stock,second],{fetcher,now:now+60000});assert.equal(calls,1);
  await assert.rejects(fetchPrices(Array(26).fill(stock)),/25/);
});
test('provider failure retains a dated quote and imported chart history without inventing a value',async()=>{
  const result=await fetchPrices([stock,fund],{useCache:false,now,fetcher:async()=>({ok:false,status:429})});
  assert.match(result['NASDAQ:AAPL'].unavailable,/busy/);assert.match(result['INMF:125497'].unavailable,/busy/);
  const old={...parseYahooQuote(yahoo(),stock,now),history:{bars:[{close:90}]}};
  const retained=keepLastValid(old,result['NASDAQ:AAPL'],null,now);
  assert.equal(currentValue(stock,retained,now),Number(stock.quantity)*100);
  assert.deepEqual(keepLastValid(old,parseYahooQuote(yahoo(),stock,now),null,now).history,old.history);
  assert.equal(currentValue(stock,retained,now+97*3600000),null);
  const valued=valuePortfolio([stock,{...fund,snapshotValue:'100000'}],{[instrumentId(stock)]:old},null,'USD',now);
  assert.equal(valued.priced,1);assert.equal(valued.rows[1].value,null);
});

test('a newly verified listing survives a slightly older quote without replacing the newer cached price',()=>{
  const incoming=parseYahooQuote(yahoo(),stock,now);
  const old={...incoming,listingVerified:undefined,quote:{...incoming.quote,price:101,asOf:new Date(Date.parse(incoming.quote.asOf)+1000).toISOString()}};
  const retained=keepLastValid(old,incoming,null,now);
  const valued=valuePortfolio([{...stock,mapping:'unresolved'}],{[instrumentId(stock)]:retained},null,'USD',now);
  assert.equal(valued.priced,1);assert.equal(retained.quote.price,101);assert.equal(retained.quote.asOf,old.quote.asOf);
  for(const bad of [{...incoming,instrumentId:'NASDAQ:OTHER'},{...incoming,currency:'INR'},{...incoming,assetClass:'etf'}]){
    assert.notEqual(keepLastValid(old,bad,null,now).listingVerified,true);
  }
  assert.notEqual(keepLastValid({...old,ownerSupplied:true},incoming,null,now).listingVerified,true);
});

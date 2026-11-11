import { bestSeries } from './seriesCache.js';
import { recentNseCloses } from './nseCloses.js';
import { priceIdentity, priceKey, providerSymbol } from './prices.js';

const day = 86400000;
const isoDay = time => new Date(time).toISOString().slice(0, 10);
const validDay = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && isoDay(Date.parse(date)) === date;
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
const provider = 'Yahoo Finance via TigZig';
const recent = new Map(), pending = new Map();

export function adjustedSeries(prices, volumes, symbol, now = Date.now()) {
  const end = isoDay(now - day), start = isoDay(now - 420 * day);
  const bars = Object.keys(prices || {}).filter(d => validDay(d) && d >= start && d <= end && positive(prices[d]?.[symbol])).sort().map(date => {
    const volume = volumes?.[date]?.[symbol]?.Volume;
    return { date, close: prices[date][symbol], volume: typeof volume === 'number' && Number.isFinite(volume) && volume >= 0 ? volume : null };
  });
  if (bars.length < 2) throw Error('The provider did not return two completed sessions for this listing.');
  return { bars, adjustment: 'dividend-and-split-adjusted', returnType: 'Changes in adjusted closing prices include dividend and split adjustments.', provider,
    source: 'https://finance.yahoo.com/quote/' + encodeURIComponent(symbol) + '/history/', fetchedAt: new Date(now).toISOString() };
}
function fundSeries(data, p, now) {
  if (data?.status !== 'SUCCESS' || String(data.meta?.scheme_code) !== p.symbol || !Array.isArray(data.data)) throw Error('The fund source did not match this scheme.');
  const byDate = new Map(), end = isoDay(now - day);
  for (const row of data.data) {
    const date = String(row.date).split('-').reverse().join('-'), close = Number(row.nav);
    if (validDay(date) && date <= end && positive(close)) byDate.set(date, { date, close, volume: null });
  }
  const bars = [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-300);
  if (bars.length < 2) throw Error('The provider did not return two published NAVs for this scheme.');
  return { bars, adjustment:'unknown', returnType:'Published NAV. Distribution adjustments and trading volume are unavailable.', provider:'MFapi.in · AMFI NAV', source:'https://api.mfapi.in/mf/'+p.symbol, fetchedAt:new Date(now).toISOString() };
}
export function historyIsOld(history, now = Date.now()) {
  return !history?.bars?.length || now - Date.parse(history.bars.at(-1).date) > 7 * day;
}
async function read(url, fetcher) {
  const r = await fetcher(url,{signal:AbortSignal.timeout(25000),cache:'no-store',headers:{Accept:'application/json'}});
  if (!r.ok) throw Error(r.status===429?'The history provider is busy. Please retry shortly.':'The history provider could not be reached. Please retry.');
  return r.json();
}
export async function fetchMarketHistory(raw,{now=Date.now(),fetcher=fetch,useCache=fetcher===fetch}={}) {
  const p = priceIdentity(raw);
  if (!p) throw Error('This exchange or asset type is not covered by the daily history feed.');
  const key = priceKey(p) + ':' + isoDay(now);
  if (useCache && recent.has(key)) return recent.get(key);
  if (useCache && pending.has(key)) return pending.get(key);
  const load = async () => {
    if (p.exchange==='INMF') return fundSeries(await read('https://api.mfapi.in/mf/'+p.symbol,fetcher),p,now);
    const symbol=providerSymbol(p),query='/?'+new URLSearchParams({tickers:symbol,start_date:isoDay(now-420*day),end_date:isoDay(now-day)});
    try {const [prices,volumes]=await Promise.all([read('https://yfin-h.tigzig.com/v1/get-adj-close'+query,fetcher),read('https://yfin-h.tigzig.com/v1/get-all-prices'+query,fetcher).catch(()=>null)]);
    const result=adjustedSeries(prices,volumes,symbol,now);
    if(p.exchange!=='NSE'||!historyIsOld(result,now))return result;
    return bestSeries(result,await recentNseCloses(p.symbol,{now,fetcher}).catch(()=>null));
    } catch(e){if(p.exchange!=='NSE')throw e;return recentNseCloses(p.symbol,{now,fetcher});}
  };
  const promise=load();
  if(useCache) pending.set(key,promise);
  try{
    const history=await promise;
    if(useCache && !historyIsOld(history,now) && (p.assetClass==='mutual_fund'||history.bars.at(-1).volume!==null)){if(recent.size>=128)recent.delete(recent.keys().next().value);recent.set(key,history);}
    return history;
  }finally{if(useCache)pending.delete(key);}
}

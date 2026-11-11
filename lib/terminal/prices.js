import { instrumentId, quoteState } from './domain.js';
import { readUsIntraday, supportsUsIntraday } from './usQuotes.js';

const EXCHANGE_CODES = { NSE: ['NSI'], BSE: ['BSE'], NASDAQ: ['NMS', 'NGM', 'NCM', 'NAS'], NYSE: ['NYQ'], NYSEARCA: ['PCX'], USMF: ['NAS'] };
const TYPE_CODES = { equity: 'EQUITY', etf: 'ETF', mutual_fund: 'MUTUALFUND' };
export const PRICE_REFRESH_MS = 5 * 60000;

// This is a quote identity, not a holding. Never send account details, balances,
// quantities or uploaded images to market-data providers.
export function priceIdentity(raw) {
  const p = { symbol: String(raw.symbol || '').trim().toUpperCase(), exchange: raw.exchange, currency: raw.currency, assetClass: raw.assetClass };
  if (!/^[A-Z0-9.^&=_/-]{1,40}$/.test(p.symbol) || !TYPE_CODES[p.assetClass]) return null;
  if (p.exchange === 'INMF') return p.assetClass === 'mutual_fund' && p.currency === 'INR' && /^\d{5,6}$/.test(p.symbol) ? p : null;
  if (!EXCHANGE_CODES[p.exchange] || p.currency !== (['NSE','BSE'].includes(p.exchange) ? 'INR' : 'USD')) return null;
  if ((p.exchange === 'USMF') !== (p.assetClass === 'mutual_fund')) return null;
  if (!['NSE','BSE'].includes(p.exchange) && !/^[A-Z0-9-]{1,20}$/.test(p.symbol)) return null;
  if (p.exchange === 'NSE' && /\.BO$/.test(p.symbol) || p.exchange === 'BSE' && /\.NS$/.test(p.symbol)) return null;
  return p;
}
export const priceKey = p => `${instrumentId(p)}:${p.currency}:${p.assetClass}`;
export function providerSymbol(p) {
  const suffix = p.exchange === 'NSE' ? '.NS' : p.exchange === 'BSE' ? '.BO' : '';
  return suffix && !p.symbol.endsWith(suffix) ? p.symbol + suffix : p.symbol;
}
function quoteRecord(p, { price, asOf, name, provider, source, quality, session }, now) {
  const quote = { price: Number(price), currency: p.currency, asOf, quality, session };
  if (!name || !Number.isFinite(quote.price) || quote.price <= 0 || ['missing','stale'].includes(quoteState({ quote }, now))) throw Error('A recent, timestamped price is unavailable.');
  return { instrumentId: instrumentId(p), exchange: p.exchange, currency: p.currency, assetClass: p.assetClass, name, provider, source, fetchedAt: new Date(now).toISOString(), quote };
}
export function parseYahooQuote(raw, p, now = Date.now()) {
  const symbol = providerSymbol(p), info = raw?.[symbol]?.main_info;
  if (!info || info.symbol !== symbol || info.currency !== p.currency || info.quoteType !== TYPE_CODES[p.assetClass] || !EXCHANGE_CODES[p.exchange]?.includes(info.exchange)) throw Error('The provider listing does not match this ticker, exchange, currency and asset type.');
  const time = Number(info.regularMarketTime) * 1000;
  if (!Number.isFinite(time) || time <= 0) throw Error('The provider did not supply a quote time.');
  // Do not substitute currentPrice/navPrice without their own observation time,
  // or describe a cached regular-session quote as a real-time trade.
  const fund = p.assetClass === 'mutual_fund';
  let observation = { price: info.regularMarketPrice, time, session: fund ? 'Daily fund valuation' : 'Latest regular-session quote' };
  if (supportsUsIntraday(p)) {
    for (const [prefix, session] of [['preMarket', 'Pre-market'], ['postMarket', 'After-hours']]) {
      const stamp = info[prefix + 'Time'] * 1000, price = info[prefix + 'Price'];
      if (Number.isFinite(price) && price > 0 && stamp > observation.time && stamp <= now) {
        observation = { price, time: stamp, session };
      }
    }
  }
  const record = quoteRecord(p, {
    price: observation.price, asOf: new Date(observation.time).toISOString(), session: observation.session,
    name: info.longName || info.shortName, provider: 'Yahoo Finance via TigZig',
    source: `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`, quality: fund ? 'daily NAV' : 'delayed'
  }, now);
  return { ...record, listingVerified: true };
}
export function parseFundQuote(raw, p, now = Date.now()) {
  if (raw?.status !== 'SUCCESS' || String(raw.meta?.scheme_code) !== p.symbol) throw Error('The returned fund scheme does not match.');
  const item = raw.data?.[0], match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(item?.date || '');
  if (!match) throw Error('The fund NAV date is unavailable.');
  const date = `${match[3]}-${match[2]}-${match[1]}`, asOf = `${date}T00:00:00.000Z`;
  if (!Number.isFinite(Date.parse(asOf)) || new Date(asOf).toISOString().slice(0,10) !== date) throw Error('The fund NAV date is invalid.');
  return quoteRecord(p, { price: item.nav, asOf, name: raw.meta.scheme_name, provider: 'MFapi.in · AMFI NAV', source: `https://api.mfapi.in/mf/${p.symbol}/latest`, quality: 'daily NAV', session: 'Daily fund valuation' }, now);
}

const recent = new Map(), pending = new Map();
async function getJSON(url, fetcher, timeout = 30000) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(timeout), cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw Error(response.status === 429 ? 'Price feed is busy. Retry in a few minutes.' : 'Price feed is temporarily unavailable.');
  return response.json();
}
function sharedJSON(url, fetcher, useCache, timeout) {
  if (!useCache) return getJSON(url, fetcher, timeout);
  if (!pending.has(url)) {
    pending.set(url, getJSON(url, fetcher, timeout).finally(() => pending.delete(url)));
  }
  return pending.get(url);
}
export async function findListings({ query, currency, assetClass }, fetcher = fetch) {
  const q = String(query || '').trim();
  if (q.length < 2 || q.length > 120 || !['USD','INR'].includes(currency) || !TYPE_CODES[assetClass]) throw Error('Enter a company or fund name and choose its currency and asset type.');
  if (assetClass === 'mutual_fund' && currency === 'INR') {
    const data = await getJSON(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(q)}`, fetcher);
    return (Array.isArray(data) ? data : []).slice(0,15).filter(r => /^\d{5,6}$/.test(String(r.schemeCode)) && typeof r.schemeName === 'string').map(r => ({ symbol:String(r.schemeCode),name:r.schemeName,exchange:'INMF',currency:'INR',assetClass:'mutual_fund' }));
  }
  const data = await getJSON(`https://yfin-h.tigzig.com/v1/search/?q=${encodeURIComponent(q)}&limit=15&type=${TYPE_CODES[assetClass].toLowerCase()}`, fetcher);
  return (Array.isArray(data?.results) ? data.results : []).filter(r => r.quoteType === TYPE_CODES[assetClass] && (assetClass !== 'mutual_fund' || EXCHANGE_CODES.USMF.includes(r.exchange))).map(r => {
    const exchange = assetClass === 'mutual_fund' ? 'USMF' : Object.keys(EXCHANGE_CODES).find(e => e !== 'USMF' && EXCHANGE_CODES[e].includes(r.exchange));
    const p = { name:r.name || r.longname || r.shortname,symbol:r.symbol,exchange,currency:['NSE','BSE'].includes(exchange)?'INR':'USD',assetClass };
    return p.currency === currency && typeof p.name === 'string' && priceIdentity(p) ? p : null;
  }).filter(Boolean);
}
export async function fetchPrices(input, { fetcher = fetch, now = Date.now(), useCache = true } = {}) {
  if (!Array.isArray(input) || input.length > 25) throw Error('Request up to 25 investments at a time.');
  const positions = [...new Map(input.map(priceIdentity).filter(Boolean).map(p => [priceKey(p), p])).values()];
  const output = {}, needed = [];
  for (const p of positions) {
    const cached = recent.get(priceKey(p));
    if (useCache && cached && now - cached.at < PRICE_REFRESH_MS) output[instrumentId(p)] = cached.data;
    else needed.push(p);
  }
  const save = (p, data) => {
    output[instrumentId(p)] = data;
    if (useCache) { if (recent.size >= 1000) recent.delete(recent.keys().next().value); recent.set(priceKey(p), { at: now, data }); }
  };
  const us = needed.filter(supportsUsIntraday);
  const fallback = needed.filter(p => !supportsUsIntraday(p));
  let nextUs = 0;
  await Promise.all(Array.from({ length: Math.min(3, us.length) }, async () => {
    while (nextUs < us.length) {
      const p = us[nextUs++];
      const url = 'https://query1.finance.yahoo.com/v8/finance/chart/' + encodeURIComponent(p.symbol) + '?interval=1m&range=1d&includePrePost=true';
      try {
        const raw = await sharedJSON(url, fetcher, useCache, 6000);
        const record = quoteRecord(p, readUsIntraday(raw, p, now), now);
        save(p, { ...record, listingVerified: true });
      } catch {
        fallback.push(p);
      }
    }
  }));
  const groups = [fallback.filter(p => p.exchange !== 'INMF'), ...fallback.filter(p => p.exchange === 'INMF').map(p => [p])].filter(g => g.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(2, groups.length) }, async () => {
    while (cursor < groups.length) {
      const group = groups[cursor++], fund = group[0].exchange === 'INMF';
      const url = fund ? `https://api.mfapi.in/mf/${group[0].symbol}/latest` : `https://yfin-h.tigzig.com/v1/get-detailed-info/?tickers=${encodeURIComponent(group.map(providerSymbol).join(','))}`;
      try {
        const raw = await sharedJSON(url, fetcher, useCache);
        for (const p of group) {
          try { save(p, fund ? parseFundQuote(raw, p, now) : parseYahooQuote(raw, p, now)); }
          catch (e) { save(p, { unavailable: e.message }); }
        }
      } catch (e) { for (const p of group) save(p, { unavailable: e.name === 'TimeoutError' ? 'Price feed timed out. Please retry.' : e.message }); }
    }
  }));
  return output;
}

export function currentValue(p, data, now = Date.now()) {
  if (!data || data.instrumentId !== instrumentId(p) || data.assetClass !== p.assetClass || data.quote?.currency !== p.currency || ['missing','stale'].includes(quoteState(data, now)) || !/^\d+(\.\d{1,18})?$/.test(String(p.quantity))) return null;
  const value = Number(p.quantity) * data.quote.price;
  return Number.isFinite(value) ? value : null;
}

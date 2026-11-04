import { QUOTE_MARKETS, validQuote, withObservedMove } from './quotes.js';
import { exchangeClock, sessionHours } from './sessions.js';

const MINUTE = 60000;
const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;

export function parseSpot(data, id, now = Date.now()) {
  const quote = { id, price: data?.price, asOf: data?.updatedAt };
  if (data?.symbol !== id || data?.currency !== 'USD' || !validQuote(quote, id, now)) throw Error('Invalid spot quote');
  return quote;
}

export function parseIndex(data, id, symbol, now = Date.now()) {
  if (data?.symbol !== symbol || data?.currency !== 'USD' || data?.interval !== '5m' || !['fresh', 'stale'].includes(data?.data_state?.status)) throw Error('Invalid index series');
  const points = (Array.isArray(data.points) ? data.points : []).filter(point => positive(point.c) && Number.isFinite(point.t)).sort((a,b) => a.t - b.t);
  const last = points.at(-1);
  if (!last) throw Error('Empty index series');
  const quote = { id, price: last.c, asOf: new Date(last.t * 1000).toISOString(), stale: data.data_state.status === 'stale' };
  if (!validQuote(quote, id, now)) throw Error('Invalid index timestamp');
  const day=exchangeClock(last.t*1000,'America/New_York').date;
  const prior=points.findLast(point=>exchangeClock(point.t*1000,'America/New_York').date<day);
  if(prior){
    const session=sessionHours(id,prior.t*1000);
    // Require the prior session's final five-minute bar (or closing point).
    // Its bar close is a transparent comparison, not an official daily close.
    if(!session.weekend&&!session.holiday&&Number.isFinite(session.close)&&session.minute>=session.close-5&&session.minute<=session.close)
      quote.movement={basis:'session',price:prior.c,asOf:new Date(prior.t*1000).toISOString()};
  }
  return quote;
}

export function parseSensex(data, now = Date.now()) {
  if (!data?.ids?.includes('^BSESN') || data?.meta?.unknown_ids?.length || data?.meta?.empty_ids?.length) throw Error('Missing Sensex series');
  const rows = (Array.isArray(data.data) ? data.data : []).filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.date) && positive(row['^BSESN'])).sort((a,b) => a.date.localeCompare(b.date));
  const last = rows.at(-1), prior = rows.at(-2);
  // The source supplies a trading date, not an intraday quote time. The UI must
  // display this as a dated daily close, never as midnight or a live reading.
  const quote = { id: 'SENSEX', price: last?.['^BSESN'], asOf: last ? `${last.date}T00:00:00.000Z` : null };
  if (!validQuote(quote, 'SENSEX', now)) throw Error('Invalid Sensex close');
  if (prior) {
    quote.changePercent = (quote.price / prior['^BSESN'] - 1) * 100;
    quote.movement={basis:'close',price:prior['^BSESN'],asOf:`${prior.date}T00:00:00.000Z`};
  }
  return quote;
}

export function parseFX(data, now = Date.now()) {
  if (data?.result !== 'success' || data?.base_code !== 'AED' || !positive(data?.time_last_update_unix)) throw Error('Invalid AED rate');
  const quote = { id: 'AEDINR', price: data.rates?.INR, asOf: new Date(data.time_last_update_unix * 1000).toISOString() };
  if (!validQuote(quote, 'AEDINR', now)) throw Error('Invalid INR conversion');
  return quote;
}

// Fixed dashboard instruments only; never accepts a caller-supplied URL,
// account context or arbitrary symbols. This is not a portfolio price API.
export function createQuoteFeed({ fetcher = (...args) => fetch(...args), clock = Date.now } = {}) {
  const cache = new Map(), pending = new Map();
  async function read(item) {
    const now = clock(), prior = cache.get(item.id);
    if (prior?.expires > now) return prior.quote;
    if (pending.has(item.id)) return pending.get(item.id);
    const request = (async () => {
      let quote, ttl = item.kind === 'fx' ? 60 * MINUTE : item.kind === 'daily' ? 15 * MINUTE : item.kind === 'bar' ? 2 * MINUTE : MINUTE;
      try {
        const day = stamp => new Date(stamp).toISOString().slice(0,10);
        const url = item.kind === 'fx' ? 'https://open.er-api.com/v6/latest/AED' : item.kind === 'spot' ? `https://api.gold-api.com/price/${item.id}`
          : item.kind === 'daily' ? `https://api.tigzig.com/v1/series?ids=%5EBSESN&from=${day(now - 10 * 86400000)}&to=${day(now)}`
          : 'https://xaus.com/api/v1/chart?symbol=nasdaq&range=5d&interval=5m';
        const response = await fetcher(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(9000), cache: 'no-store' });
        if (!response.ok) throw Error(`Provider returned ${response.status}`);
        const data = await response.json();
        quote = item.kind === 'fx' ? parseFX(data, now) : item.kind === 'spot' ? parseSpot(data, item.id, now) : item.kind === 'daily' ? parseSensex(data, now) : parseIndex(data, item.id, 'nasdaq', now);
        quote = withObservedMove({ ...quote, fetchedAt: new Date(clock()).toISOString(), updateFailed: false },prior?.quote,now);
      } catch {
        ttl = 30 * 1000;
        quote = validQuote(prior?.quote, item.id, now) ? { ...prior.quote, stale: true, updateFailed: true } : { id: item.id, price: null, asOf: null, updateFailed: true };
      }
      cache.set(item.id, { quote, expires: clock() + ttl });
      return quote;
    })();
    pending.set(item.id, request);
    try { return await request; } finally { pending.delete(item.id); }
  }
  return async function getQuotes() {
    const results = await Promise.allSettled(QUOTE_MARKETS.map(read));
    const quotes = results.map((result,i) => result.status === 'fulfilled' ? result.value : { id: QUOTE_MARKETS[i].id, price: null, asOf: null, updateFailed: true });
    return { version: 1, fetchedAt: new Date(clock()).toISOString(), quotes };
  };
}

export const fetchDashboardQuotes = createQuoteFeed();

import { instrumentId, parseCSV, mergeListingVerification } from './domain.js';
import { validateBars } from './indicators.js';
import { fetchPrices, priceIdentity } from './prices.js';

export const FEED_COVERAGE = [
  { market: 'India', status: 'Delayed quotes', detail: 'NSE/BSE stocks and ETFs via TigZig / Yahoo Finance. Current value = latest available price × your saved quantity. Checked every five minutes while the desk is open. Free coverage varies; timestamps are shown.' },
  { market: 'US', status: 'Intraday and extended hours', detail: 'US stock and ETF values use the latest available Yahoo Finance observation, including pre-market and after-hours. The badge identifies the session of the price. Quotes are indicative and may be delayed.' },
  { market: 'Mutual funds', status: 'Daily NAV', detail: 'Indian funds by exact AMFI scheme code via MFapi.in; US funds by exact ticker via Yahoo Finance. Current value = latest available NAV × units. NAV is daily, not an intraday price. Confirm the plan and growth/distribution option. Fund holdings and distributions are not connected.' },
  { market: 'FX', status: 'Daily indicative rates', detail: 'ExchangeRate-API open feed. Refreshed daily; not executable trading rates. Conversion is unavailable if rates are older than 72 hours.' },
];
async function getJSON(url, fetcher = fetch) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(12000), cache: 'no-store', headers: { Accept: 'application/json' } });
      if (!response.ok) { const e = Error(response.status === 429 ? 'Provider rate limit. Last valid data retained.' : 'Price provider unavailable. Last valid data retained.'); e.retry = response.status === 429 || response.status >= 500; throw e; }
      return await response.json();
    } catch (e) { if (attempt || e.retry === false || (e.retry === undefined && e.name !== 'TimeoutError' && e.name !== 'TypeError')) throw Error('Provider response unavailable. Last valid data retained.'); await new Promise(r => setTimeout(r, 700)); }
  }
}
export async function fetchFX(fetcher = fetch, now = Date.now()) {
  const data = await getJSON('https://open.er-api.com/v6/latest/USD', fetcher);
  const asOf = Number(data.time_last_update_unix) * 1000;
  if (data.result !== 'success' || data.base_code !== 'USD' || !Number.isFinite(asOf) || asOf > now + 300000 || now - asOf > 72 * 3600000 || ['USD', 'INR', 'AED'].some(c => !(Number(data.rates?.[c]) > 0))) throw Error('FX data is incomplete or stale. Last valid rates retained.');
  return { rates: Object.fromEntries(['USD', 'INR', 'AED'].map(c => [c, Number(data.rates[c])])), asOf: new Date(asOf).toISOString(), fetchedAt: new Date(now).toISOString(), provider: 'ExchangeRate-API', source: 'https://www.exchangerate-api.com', quality: 'daily indicative' };
}
export async function fetchInstrument(p, { fetcher = fetch, now = Date.now(), personalFeed = false } = {}) {
  if (['equity', 'etf'].includes(p.assetClass) && priceIdentity(p)) return (await fetchPrices([p], { fetcher, now }))[instrumentId(p)];
  if (p.mapping !== 'confirmed') return { unavailable: 'Confirm the exchange, ticker and product before pricing.' };
  if (priceIdentity(p)) return (await fetchPrices([p], { fetcher, now }))[instrumentId(p)];
  if (p.assetClass === 'mutual_fund') return { unavailable: 'Use the exact AMFI scheme code for an Indian fund, or the US fund ticker.' };
  if (p.assetClass !== 'crypto' || p.exchange !== 'CRYPTO' || !personalFeed) return { unavailable: 'No licensed automated price feed for this instrument. Add sourced end-of-day history.' };
  if (!/^[A-Z0-9]{2,12}$/.test(p.symbol) || p.currency !== 'USD') return { unavailable: 'This Coinbase USD product is unsupported.' };
  const product = `${p.symbol}-USD`, base = `https://api.exchange.coinbase.com/products/${product}`;
  const end = Math.floor(now / 86400000) * 86400000;
  const start = end - 299 * 86400000;
  const [ticker, candles] = await Promise.all([getJSON(`${base}/ticker`, fetcher), getJSON(`${base}/candles?granularity=86400&start=${encodeURIComponent(new Date(start).toISOString())}&end=${encodeURIComponent(new Date(end).toISOString())}`, fetcher)]);
  const price = Number(ticker.price), asOf = Date.parse(ticker.time);
  if (!(price > 0) || !Number.isFinite(asOf) || asOf > now + 300000 || now - asOf > 86400000 || !Array.isArray(candles)) throw Error('Provider returned an invalid or stale quote. Last valid data retained.');
  const history = validateBars(candles.filter(c => c[0] * 1000 >= start && c[0] * 1000 < end).map(c => ({ date: new Date(c[0] * 1000).toISOString().slice(0, 10), low: c[1], high: c[2], open: c[3], close: c[4], volume: c[5] })), 'not-applicable');
  return { instrumentId: instrumentId(p), currency: 'USD', exchange: 'CRYPTO', provider: 'Coinbase Exchange', fetchedAt: new Date(now).toISOString(), source: `https://www.coinbase.com/price/${p.symbol === 'BTC' ? 'bitcoin' : p.symbol === 'ETH' ? 'ethereum' : p.symbol.toLowerCase()}`, quote: { price, currency: 'USD', asOf: new Date(asOf).toISOString(), quality: 'live', session: '24/7' }, history, restrictedToPersonalUse: true };
}
export function importHistory(text, p, { source, adjustment, asOf }, now = Date.now()) {
  let url; try { url = new URL(source); } catch { throw Error('Add the source URL for this history.'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw Error('Use an HTTP source URL.');
  if (p.assetClass === 'mutual_fund') throw Error('Use reported holding values for funds. NAV history import is not connected.');
  if (p.mapping !== 'confirmed') throw Error('Confirm the security mapping first.');
  const history = validateBars(parseCSV(text), adjustment);
  if (!history.bars.length || history.bars.some(b => Date.parse(b.date) >= Math.floor(now / 86400000) * 86400000)) throw Error('Use completed daily bars, dated before today.');
  const stamp = Date.parse(asOf), last = history.bars.at(-1);
  if (!Number.isFinite(stamp) || stamp > now || new Date(stamp).toISOString().slice(0, 10) !== last.date) throw Error('Quote time must match the last completed bar date, with its time zone.');
  return { instrumentId: instrumentId(p), currency: p.currency, exchange: p.exchange, provider: 'Owner-imported history', source: url.href, fetchedAt: new Date(now).toISOString(), quote: { price: last.close, currency: p.currency, asOf: new Date(stamp).toISOString(), quality: 'imported EOD', session: 'Calendar unavailable' }, history: {...history,provider:'Owner-imported history',source:url.href,fetchedAt:new Date(now).toISOString()}, ownerSupplied: true };
}
export function keepLastValid(previous, incoming, error, now = Date.now()) {
  if (error || incoming?.unavailable) return { ...previous, unavailable: incoming?.unavailable || previous?.unavailable, lastError: error || incoming?.unavailable, checkedAt: new Date(now).toISOString(), consecutiveFailures: (previous?.consecutiveFailures || 0) + 1 };
  if (previous?.quote && Date.parse(previous.quote.asOf) > Date.parse(incoming?.quote?.asOf)) return { ...mergeListingVerification(previous, incoming), checkedAt: new Date(now).toISOString() };
  return { ...incoming, ...(previous?.history && !incoming?.history ? { history: previous.history } : {}), checkedAt: new Date(now).toISOString(), consecutiveFailures: 0 };
}

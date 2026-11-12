import { sessionHours } from '../dashboard/sessions.js';

const venueCodes = { NASDAQ: ['NMS', 'NGM', 'NCM', 'NAS'], NYSE: ['NYQ'], NYSEARCA: ['PCX'] };
const sessionLabels = { pre: 'Pre-market', regular: 'Regular session', post: 'After-hours' };

export function supportsUsIntraday(position) {
  return Object.hasOwn(venueCodes, position.exchange) && ['equity', 'etf'].includes(position.assetClass);
}

function regularSessionLabel(time, periodEnd) {
  if (Number.isFinite(periodEnd) && Math.abs(time - periodEnd) < 60 && time >= periodEnd) return 'Regular close';
  const hours = sessionHours('NASDAQ', time * 1000);
  return !hours.holiday && !hours.weekend && hours.minute === hours.close ? 'Regular close' : 'Regular session';
}

// Legacy saved quotes only include the regular-market timestamp. Keep displaying
// their actual observation until a successful refresh replaces them.
export function usQuoteLabel(position, quote, status) {
  if (!quote || !supportsUsIntraday(position) || !['indicative', 'delayed'].includes(status)) return status;
  if (Object.values(sessionLabels).includes(quote.session) || quote.session === 'Regular close') return quote.session;
  if (quote.session === 'Latest regular-session quote') {
    return regularSessionLabel(Date.parse(quote.asOf) / 1000) === 'Regular close' ? 'Regular close' : 'Regular-session quote';
  }
  return status;
}

const validPrice = n => typeof n === 'number' && Number.isFinite(n) && n > 0;
const validTime = (n, now) => Number.isInteger(n) && n > 0 && n * 1000 <= now;

export function readUsIntraday(raw, position, now) {
  const result = raw?.chart?.result?.[0], meta = result?.meta;
  const type = position.assetClass === 'etf' ? 'ETF' : 'EQUITY';
  if (!supportsUsIntraday(position) || !meta || meta.symbol !== position.symbol ||
      meta.currency !== 'USD' || !venueCodes[position.exchange].includes(meta.exchangeName) ||
      meta.instrumentType !== type || meta.dataGranularity !== '1m') {
    throw Error('The intraday source did not match this US listing.');
  }
  const periods = meta.currentTradingPeriod || {};
  let latest;
  if (validPrice(meta.regularMarketPrice) && validTime(meta.regularMarketTime, now)) {
    latest = { price: meta.regularMarketPrice, time: meta.regularMarketTime,
      session: regularSessionLabel(meta.regularMarketTime, periods.regular?.end) };
  }
  const times = result.timestamp || [], closes = result.indicators?.quote?.[0]?.close || [];
  for (let i = times.length - 1; i >= 0; i--) {
    const time = times[i];
    if (!validTime(time, now) || !validPrice(closes[i])) continue;
    if (latest && time <= latest.time) break;
    const period = Object.keys(sessionLabels).find(key => time >= periods[key]?.start && time < periods[key]?.end);
    if (period) {
      latest = { price: closes[i], time, session: sessionLabels[period] };
      break;
    }
  }
  if (!latest) throw Error('No timestamped US price was available.');
  return { price: latest.price, asOf: new Date(latest.time * 1000).toISOString(), session: latest.session,
    name: meta.longName || meta.shortName, quality: 'indicative', provider: 'Yahoo Finance',
    source: 'https://finance.yahoo.com/quote/' + encodeURIComponent(position.symbol) + '/' };
}

import { marketOf } from './domain.js';
import { evidenceURL } from './evidence.js';

export const HOLDING_NEWS_LIMIT = 40;
export function holdingMarket(p) {
  const market = marketOf(p);
  if (['India', 'US'].includes(market)) return market;
  if (p.exchange === 'UNRESOLVED') return p.currency === 'INR' ? 'India' : p.currency === 'USD' ? 'US' : null;
  return null;
}
export const holdingKey = p => `${p.exchange === 'UNRESOLVED' ? p.currency : p.exchange}:${p.symbol}`;
export function trackingHoldings(positions = []) {
  return [...new Map(positions.filter(p => !p.archived && ['equity', 'etf', 'mutual_fund'].includes(p.assetClass) && holdingMarket(p)).map(p => [holdingKey(p), {
    key: holdingKey(p), name: p.name, symbol: p.symbol, exchange: p.exchange, currency: p.currency, assetClass: p.assetClass, market: holdingMarket(p), mapping: p.mapping,
  }])).values()];
}
export const trackingIdentity = positions => JSON.stringify(trackingHoldings(positions).map(p => [p.key, p.name, p.mapping]).sort((a,b) => a[0].localeCompare(b[0])));
export function headlineMatches(title, holding) {
  const normalize = s => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const text = ` ${normalize(title)} `;
  const name = normalize(holding.name).replace(/\b(incorporated|inc|corporation|corp|limited|ltd|plc)\b/g, '').replace(/\s+/g, ' ').trim();
  // Short tickers (IT, ON, A) must never match ordinary words in a headline.
  return (name.length >= 4 && text.includes(` ${name} `)) || (holding.symbol.length >= 4 && text.includes(` ${normalize(holding.symbol)} `));
}
export function currentHoldingImpacts(feed, positions, now = Date.now()) {
  const held = new Map(trackingHoldings(positions).map(p => [p.key, p]));
  let original;
  if (feed?.identity) {
    try { original = new Map(JSON.parse(feed.identity).map(([key,name]) => [key,name])); }
    catch { return []; }
  }
  const seen = new Set();
  return (feed?.items || []).flatMap(item => {
    const url = evidenceURL(item.url), date = Date.parse(item.publishedAt);
    if (!url || !Number.isFinite(date) || date > now + 300000 || now - date > 7 * 86400000) return [];
    const impacts = (item.holdingImpacts || []).filter(impact => held.has(impact.security) && (!original || original.get(impact.security) === held.get(impact.security).name) && impact.reason && impact.mechanism).map(impact => ({ ...impact, holding: held.get(impact.security) }));
    if (!impacts.length || seen.has(url)) return [];
    seen.add(url); return [{ ...item, url, holdingImpacts: impacts }];
  }).sort((a,b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
export function mergeHoldingImpacts(current, previous) {
  const byURL = new Map(previous.map(item => [item.url, item]));
  for (const item of current) {
    const old = byURL.get(item.url);
    const impacts = [...new Map([...(old?.holdingImpacts || []), ...item.holdingImpacts].map(impact => [impact.security, impact])).values()];
    byURL.set(item.url, { ...item, holdingImpacts: impacts });
  }
  return [...byURL.values()];
}
export function trackingView(state, now = Date.now()) {
  const holdings = trackingHoldings(state.document?.positions), feed = state.cache?.['portfolio-news'], job = state.cache?.['portfolio-tracking-job'];
  const entries = holdings.map(p => ({ ...p, ...(feed?.coverage?.[p.key] || {}), headlines: (feed?.coverage?.[p.key]?.headlines || []).filter(n => evidenceURL(n.url) && Number.isFinite(Date.parse(n.publishedAt)) && Date.parse(n.publishedAt) <= now + 300000 && now - Date.parse(n.publishedAt) <= 7 * 86400000) }));
  const running = job?.status === 'running' && now - Date.parse(job.startedAt) < 5 * 60000;
  const fresh = entries.filter(p => p.checkedAt && now - Date.parse(p.checkedAt) < 24 * 3600000 && !p.error).length;
  const changed = feed?.identity !== trackingIdentity(state.document?.positions);
  const visibleJob = job?.status === 'running' && !running ? { ...job, status: 'failed', errors: ['The last check was interrupted. Select Check now to retry.'] } : job;
  return { holdings: entries, items: currentHoldingImpacts(feed, state.document?.positions, now), total: holdings.length, fresh, running, job: visibleJob, feed,
    needsCheck: !!holdings.length && !running && (changed || !feed?.lastCheckedAt || now - Date.parse(feed.lastCheckedAt) > 6 * 3600000) && (!job?.startedAt || now - Date.parse(job.startedAt) > 10 * 60000),
  };
}

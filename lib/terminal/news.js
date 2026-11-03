import { DOMParser } from '@xmldom/xmldom';
// Same collection pattern as FinPeel /api/news: balanced regional RSS queries,
// headline + publisher link only, date ordering, deduplication and last-good cache.
export const NEWS_LANES = [
  { market: 'India', topic: 'Markets', query: '(India NSE BSE) (earnings OR stock OR RBI OR SEBI) when:3d' },
  { market: 'India', topic: 'IPOs', query: '(India NSE BSE) (IPO OR prospectus OR listing) when:7d' },
  { market: 'India', topic: 'Funds', query: 'India ("mutual fund" OR ETF OR "new fund offer") when:7d' },
  { market: 'UAE', topic: 'Markets', query: '(UAE DFM ADX) (earnings OR shares OR "central bank") when:3d' },
  { market: 'UAE', topic: 'IPOs', query: '(UAE DFM ADX) (IPO OR prospectus OR listing) when:7d' },
  { market: 'US', topic: 'Markets', query: '(US stocks) (earnings OR inflation OR "Federal Reserve") when:3d' },
  { market: 'US', topic: 'IPOs', query: '(US Nasdaq NYSE) (IPO OR prospectus) when:7d' },
  { market: 'US', topic: 'Funds', query: '(US ETF) (inflows OR launch OR fees) when:7d' },
  { market: 'Metals', topic: 'Commodities', query: '(gold OR silver) (price OR demand OR supply) when:3d' },
  { market: 'Crypto', topic: 'Crypto', query: '(bitcoin OR ethereum) (regulation OR ETF OR market) when:3d' },
];
function url(value) { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; } }
export function parseNews(xml, lane, now = Date.now()) {
  if (xml.length > 1500000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('Unsupported feed response.');
  const doc = new DOMParser({ errorHandler: { warning() {}, error() {}, fatalError() {} } }).parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagName('item')).map(item => {
    const field = tag => item.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
    const date = Date.parse(field('pubDate')), source = field('source'), title = field('title');
    return { title: title.endsWith(` - ${source}`) ? title.slice(0, -source.length - 3) : title, url: url(field('link')), publisher: source || 'Publisher not supplied', publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : null, market: lane.market, topic: lane.topic, evidence: 'Publisher headline; open the source to verify details.' };
  }).filter(n => n.title && n.url && n.publishedAt && Date.parse(n.publishedAt) <= now + 300000 && now - Date.parse(n.publishedAt) <= 8 * 86400000).slice(0, 5);
}
export function dedupNews(items) {
  const seen = new Set();
  return [...items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).filter(n => { const title = n.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); if (seen.has(title) || seen.has(n.url)) return false; seen.add(title); seen.add(n.url); return true; });
}
let memory;
export async function fetchNews(previous, fetcher = fetch, now = Date.now()) {
  if (memory && now - Date.parse(memory.fetchedAt) < 60 * 60000) return memory;
  if (previous && now - Date.parse(previous.fetchedAt) < 60 * 60000) return previous;
  const items = [], failures = [];
  for (let i = 0; i < NEWS_LANES.length; i += 3) await Promise.all(NEWS_LANES.slice(i, i + 3).map(async lane => {
    try {
      const address = `https://news.google.com/rss/search?q=${encodeURIComponent(lane.query)}&hl=en-US&gl=US&ceid=US:en`;
      const response = await fetcher(address, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (!response.ok) throw Error('Feed unavailable');
      const parsed = parseNews(await response.text(), lane, now);
      if (!parsed.length) failures.push(`${lane.market} / ${lane.topic}: no recent results`);
      items.push(...parsed);
    } catch { failures.push(`${lane.market} / ${lane.topic}: feed unavailable`); }
  }));
  if (!items.length) return { ...(previous || { items: [], fetchedAt: null }), checkedAt: new Date(now).toISOString(), failures, stale: true };
  memory = { items: dedupNews(items), fetchedAt: new Date(now).toISOString(), failures, stale: false };
  return memory;
}

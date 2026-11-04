import { DOMParser } from '@xmldom/xmldom';
// Same collection pattern as FinPeel /api/news: balanced regional RSS queries,
// headline + publisher link only, date ordering, deduplication and last-good cache.
export const NEWS_LANES = [
  { market: 'India', topic: 'Markets', query: '(India OR NSE OR BSE) (earnings OR stock OR RBI OR SEBI) when:3d' },
  { market: 'India', topic: 'IPOs', query: '(India OR NSE OR BSE) (IPO OR prospectus OR listing) when:7d' },
  { market: 'India', topic: 'Funds', query: 'India ("mutual fund" OR ETF OR "new fund offer") when:7d' },
  { market: 'US', topic: 'Markets', query: '(US stocks) (earnings OR inflation OR "Federal Reserve") when:3d' },
  { market: 'US', topic: 'IPOs', query: '(US OR Nasdaq OR NYSE) (IPO OR prospectus) when:7d' },
  { market: 'US', topic: 'Funds', query: '(US ETF) (inflows OR launch OR fees) when:7d' },
];
function url(value) { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; } }
// Curated publishers plus primary market/issuer sources. Do not promote scraped
// quote pages, social posts, sponsored earning claims or generic buying guides.
const PUBLISHERS = /^(Reuters|Associated Press|AP News|Bloomberg(?:\.com)?|Financial Times|FT\.com|CNBC(?: TV18)?|Moneycontrol(?:\.com)?|The Economic Times|Economic Times|Mint|Livemint|Business Standard|The Hindu BusinessLine|Hindu Business Line|Zee Business|NDTV Profit|NDTV|NSE(?: India)?|BSE|SEBI|Reserve Bank of India|Gulf News|Khaleej Times|The National|ZAWYA|Zawya|Arabian Business|Gulf Business|Emirates News Agency|WAM|DFM|Dubai Financial Market|ADX|Abu Dhabi Securities Exchange|EnterpriseAM|MarketWatch|WSJ|The Wall Street Journal|Barron's|Fortune|Yahoo!? Finance(?: [A-Za-z ]+)?|Investor's Business Daily|Morningstar|ETF\.com|ETF Express|BlackRock|Vanguard|Fidelity|AMFI|World Gold Council|CoinDesk|Cointelegraph|The Block|Decrypt|Federal Reserve|SEC|Nasdaq|NYSE)$/i;
export function usefulHeadline(n, extraPublishers) {
  if(!PUBLISHERS.test(n.publisher)&&!extraPublishers?.test(n.publisher)) return false;
  if(/^current price of|^(?:gold|silver|bitcoin|ethereum) price today\b/i.test(n.title)) return false;
  if(/(?:earn|make|profit).{0,35}(?:daily|per day)|guaranteed.{0,30}(?:return|profit)|risk.free.{0,30}(?:return|profit)|(?:share|stock) price.{0,25}(?:live today|live nse|news.{0,12}quote)|forecast news and live quotes|best .{0,25}stocks to buy|how to invest/i.test(n.title)) return false;
  if(n.topic==='IPOs' && !/\bIPO\b|initial public offering|prospectus|stock market filing|(?:share|stock|market).{0,15}(?:debut|listing)|subscription|lists at/i.test(n.title)) return false;
  if(n.market==='UAE' && n.topic==='IPOs' && !/UAE|Emirati|Dubai|Abu Dhabi|\bDFM\b|\bADX\b|ADNOC|Parkin|Emaar|Talabat|\bDIP\b|Salik/i.test(n.title)) return false;
  if(n.topic==='Funds' && !/\bETF|mutual fund|\bfund(?:s|ing)?\b|NFO/i.test(n.title)) return false;
  return true;
}
export function parseNews(xml, lane, now = Date.now(), { extraPublishers } = {}) {
  if (xml.length > 1500000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('Unsupported feed response.');
  const doc = new DOMParser({ errorHandler: { warning() {}, error() {}, fatalError() {} } }).parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagName('item')).map(item => {
    const field = tag => item.getElementsByTagName(tag)[0]?.textContent?.trim() || '';
    const date = Date.parse(field('pubDate')), source = field('source'), title = field('title');
    return { title: title.endsWith(` - ${source}`) ? title.slice(0, -source.length - 3) : title, url: url(field('link')), publisher: source || 'Publisher not supplied', publishedAt: Number.isFinite(date) ? new Date(date).toISOString() : null, market: lane.market, topic: lane.topic, evidence: 'Publisher headline; open the source to verify details.' };
  }).filter(n => n.title && n.url && n.publishedAt && Date.parse(n.publishedAt) <= now + 300000 && now - Date.parse(n.publishedAt) <= 8 * 86400000 && usefulHeadline(n, extraPublishers)).slice(0, 5);
}
export function dedupNews(items) {
  const seen = new Set();
  return [...items].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).filter(n => { const title = n.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); if (seen.has(title) || seen.has(n.url)) return false; seen.add(title); seen.add(n.url); return true; });
}
let memory;
export function cleanWire(wire, now = Date.now()) {
  return { ...wire, items: (wire?.items || []).filter(item => ['India', 'US'].includes(item.market) && usefulHeadline(item) && Number.isFinite(Date.parse(item.publishedAt)) && Date.parse(item.publishedAt) <= now + 300000 && now - Date.parse(item.publishedAt) <= 8 * 86400000) };
}
export async function fetchNews(previous, fetcher = fetch, now = Date.now()) {
  if (memory && now - Date.parse(memory.fetchedAt) < 60 * 60000) return cleanWire(memory, now);
  if (previous && now - Date.parse(previous.fetchedAt) < 60 * 60000) return cleanWire(previous, now);
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
  if (!items.length) return cleanWire({ ...(previous || { items: [], fetchedAt: null }), checkedAt: new Date(now).toISOString(), failures, stale: true }, now);
  memory = { items: dedupNews(items), fetchedAt: new Date(now).toISOString(), failures, stale: false };
  return memory;
}

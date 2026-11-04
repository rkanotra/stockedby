import { parseNews, dedupNews } from '../terminal/news.js';
import { recentHeadlines } from './display.js';
export const DASHBOARD_NEWS_LANES = [
  { market: 'India', topic: 'Markets', query: '(Sensex OR Nifty OR RBI) (stocks OR market OR economy) when:2d' },
  { market: 'US', topic: 'Markets', query: '(US stocks OR Nasdaq OR Federal Reserve) (market OR earnings OR inflation) when:2d' },
  { market: 'Global', topic: 'Gold', query: '(gold prices) (Reuters OR CNBC OR Bloomberg) when:2d' },
  { market: 'Global', topic: 'Crypto', query: '(Bitcoin OR Ethereum) (Reuters OR CNBC OR CoinDesk) when:2d' },
];
let memory, pending;
export async function fetchDashboardNews(fetcher = fetch, now = Date.now()) {
  if (memory && now - Date.parse(memory.checkedAt) < 10 * 60000) return { ...memory, items: recentHeadlines(memory, now) };
  if (pending) return pending;
  pending = (async () => {
    const outcomes = await Promise.allSettled(DASHBOARD_NEWS_LANES.map(async lane => {
      const address = `https://news.google.com/rss/search?q=${encodeURIComponent(lane.query)}&hl=en-US&gl=US&ceid=US:en`;
      const r = await fetcher(address, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
      if (!r.ok) throw Error('News source unavailable');
      return parseNews(await r.text(), lane, now);
    }));
    const items = recentHeadlines({ items: dedupNews(outcomes.flatMap(o => o.status === 'fulfilled' ? o.value : [])) }, now);
    const failed = outcomes.flatMap((o,i) => o.status === 'rejected' || !o.value.length ? [DASHBOARD_NEWS_LANES[i].topic === 'Markets' ? DASHBOARD_NEWS_LANES[i].market : DASHBOARD_NEWS_LANES[i].topic] : []);
    memory = { items: items.length ? items : recentHeadlines(memory, now), checkedAt: new Date(now).toISOString(), fetchedAt: items.length ? new Date(now).toISOString() : memory?.fetchedAt || null, stale: !items.length, failures: failed };
    return memory;
  })();
  try { return await pending; } finally { pending = null; }
}

import { parseNews, dedupNews } from '../terminal/news.js';
import { recentHeadlines } from './display.js';
export const FINTECH_PUBLISHERS=/^(Finextra|FinTech Futures|The Paypers|PYMNTS(?:\.com)?|FinTech Global|TechCrunch|Sifted|Fintech News(?: Middle East| Singapore| Switzerland)?|Fintechnews(?: Middle East| Singapore| Switzerland)?|FinTech Magazine|Fintech Finance|FF News)$/i;
export const DASHBOARD_NEWS_LANES = [
  { market: 'India', topic: 'News', query: 'India (economy OR policy OR business OR government OR markets) when:2d' },
  { market: 'UAE', topic: 'News', query: '(UAE OR Dubai OR "Abu Dhabi") (news OR business OR economy OR government) when:2d' },
  { market: 'US', topic: 'News', query: '("United States" OR "US economy" OR "US election") (news OR business OR economy OR government OR markets) when:2d' },
  { market: 'Global', topic: 'Fintech', query: '(fintech OR payments OR "digital banking" OR "open banking") (funding OR launch OR regulation OR partnership OR acquisition) when:2d' },
  { market: 'Global', topic: 'Fintech', query: '(UAE OR Saudi OR India) (fintech OR "open finance" OR BNPL OR "AI banking" OR payments) when:2d' },
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
      return parseNews(await r.text(), lane, now, lane.topic==='Fintech'?{extraPublishers:FINTECH_PUBLISHERS}:{});
    }));
    const items = recentHeadlines({ items: dedupNews(outcomes.flatMap(o => o.status === 'fulfilled' ? o.value : [])) }, now);
    const failed = ['India','UAE','US','Fintech'].filter(group=>!items.some(item=>(item.topic==='Fintech'?'Fintech':item.market)===group));
    memory = { items: items.length ? items : recentHeadlines(memory, now), checkedAt: new Date(now).toISOString(), fetchedAt: items.length ? new Date(now).toISOString() : memory?.fetchedAt || null, stale: !items.length, failures: failed };
    return memory;
  })();
  try { return await pending; } finally { pending = null; }
}

import { createHash, randomUUID } from 'node:crypto';
import { parseNews, dedupNews } from './news.js';
import { trackingHoldings, trackingIdentity, headlineMatches, currentHoldingImpacts, mergeHoldingImpacts, HOLDING_NEWS_LIMIT } from './holdingNews.js';
import { runResearch, researchKey } from './research.js';

export async function fetchHoldingHeadlines(holding, { fetcher = fetch, now = Date.now() } = {}) {
  const name = holding.name.replace(/["()]/g, ' ').replace(/\b(incorporated|inc\.?|corporation|corp\.?|limited|ltd\.?|plc)\b/gi, '').trim().slice(0, 100);
  const terms = holding.assetClass === 'mutual_fund' ? `(fund OR NAV OR manager) ${holding.market === 'India' ? 'India' : 'US'}` : holding.market === 'India' ? '(NSE OR BSE OR India)' : '(stock OR shares OR earnings)';
  const query = `"${name}" ${terms} when:7d`;
  const address = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const response = await fetcher(address, { signal: AbortSignal.timeout(6000), cache: 'no-store' });
  if (!response.ok) throw Error('Holding news source unavailable.');
  return parseNews(await response.text(), { market: holding.market, topic: 'Holdings' }, now).filter(n => headlineMatches(n.title, holding)).slice(0, 3);
}

export async function reservePortfolioTracking(store, { positions, market = 'All', key, now = new Date(), kind = 'tracking' }) {
  const identity = trackingIdentity(positions);
  const hash = createHash('sha256').update(identity).digest('hex').slice(0, 24);
  const runKey = key || `holdings:${market}:${hash}:${Math.floor(now.getTime() / 300000)}`;
  let reservation = await store('begin', { kind, key: runKey });
  if (!key && reservation.existing && ['failed', 'interrupted', 'partial'].includes(reservation.status)) reservation = await store('begin', { kind, key: `${runKey}:retry:${randomUUID()}` });
  if (!reservation.existing) await store('cache', { key: 'portfolio-tracking-job', data: { status: 'running', startedAt: now.toISOString(), market } });
  return reservation;
}

export async function trackPortfolio(store, { reservation, market = 'All', key, now = new Date(), kind = 'tracking' } = {}, dependencies = {}) {
  let state, feed;
  const result = { kind: 'tracking', market, errors: [], research: [], checked: 0 };
  try {
    state = await store('load');
    const holdings = trackingHoldings(state.document.positions), previous = state.cache?.['portfolio-news'] || {};
    const candidates = holdings.filter(p => market === 'All' || p.market === market);
    if (!candidates.length && !reservation) return { status: 'skipped', result };
    reservation ||= await reservePortfolioTracking(store, { positions: state.document.positions, market, key, now, kind });
    if (reservation.existing) return { existing: true, status: reservation.status, result: reservation.result };
    const keys = new Set(holdings.map(p => p.key));
    const coverage = Object.fromEntries(Object.entries(previous.coverage || {}).filter(([key]) => keys.has(key)));
    // Oldest/unchecked first: large portfolios advance on later scans rather than starving their last rows.
    const selected = [...candidates].sort((a,b) => (Date.parse(coverage[a.key]?.checkedAt) || 0) - (Date.parse(coverage[b.key]?.checkedAt) || 0)).slice(0, HOLDING_NEWS_LIMIT);
    for (let i = 0; i < selected.length; i += 4) {
      await Promise.all(selected.slice(i, i + 4).map(async holding => {
        try {
          const headlines = await (dependencies.fetchHoldingHeadlines || fetchHoldingHeadlines)(holding, { now: now.getTime() });
          coverage[holding.key] = { checkedAt: now.toISOString(), headlines, error: null }; result.checked++;
        } catch {
          coverage[holding.key] = { ...coverage[holding.key], attemptedAt: now.toISOString(), error: 'Holding news source unavailable; earlier headlines may remain.' };
          result.errors.push(`${holding.symbol}: holding news source unavailable.`);
        }
      }));
    }
    const leads = dedupNews(selected.flatMap(p => (coverage[p.key]?.headlines || []).slice(0, 2))).slice(0, 50);
    let research, analysisError = null;
    if (selected.length) {
      try {
        research = await (dependencies.runResearch || runResearch)({ kind: 'tracking', market, positions: selected, cache: { wire: { items: leads } }, settings: {}, now });
        result.research.push(research);
      } catch (e) { analysisError = e.message; result.errors.push(e.message); if (e.usage) result.failedUsage = [e.usage]; }
    }
    const newItems = (research?.news || []).filter(n => n.reportedFact && n.holdingImpacts?.length);
    const combined = mergeHoldingImpacts(newItems, currentHoldingImpacts(previous, state.document.positions, now.getTime()));
    feed = { identity: trackingIdentity(state.document.positions), coverage, items: currentHoldingImpacts({ items: combined }, state.document.positions, now.getTime()).slice(0, 80).map(({ holdingImpacts, ...item }) => ({ ...item, holdingImpacts: holdingImpacts.map(({ holding, ...impact }) => impact) })), lastCheckedAt: now.toISOString(), lastAnalysisAt: research ? now.toISOString() : previous.lastAnalysisAt || null, analysisError, gaps: research?.gaps || [], deferred: candidates.length - selected.length };
    if (feed.deferred) result.errors.push(`${feed.deferred} additional holdings are queued for a later scan. Up to ${HOLDING_NEWS_LIMIT} distinct stocks are checked per run.`);
    await store('cache', { key: 'portfolio-news', data: feed });
    // Re-read just before alerts: an archived/deleted holding must not receive new notifications.
    const latest = await store('load');
    const alerts = currentHoldingImpacts({ items: newItems }, latest.document.positions, now.getTime()).filter(item => item.material).flatMap(item => item.holdingImpacts.map(impact => ({
      key: researchKey([item.url, impact.security]), data: { type: 'holding news', title: item.title, url: item.url, publishedAt: item.publishedAt, security: impact.security, impact: impact.reason, mechanism: impact.mechanism, direction: impact.direction, watchFor: impact.watchFor, uncertainty: impact.uncertainty, relationship: impact.relationship, impactType: 'AI inference' },
    })));
    const status = result.errors.length ? 'partial' : 'complete';
    await store('finish', { ...reservation, status, result, alerts });
    await store('cache', { key: 'portfolio-tracking-job', data: { status, market, startedAt: now.toISOString(), finishedAt: new Date().toISOString(), errors: result.errors } });
    return { status, result };
  } catch (e) {
    if (!reservation || reservation.existing) throw e;
    result.errors.push('Tracking did not finish. Saved holdings and previous news remain available.');
    await store('finish', { ...reservation, status: 'failed', result, alerts: [] }).catch(() => {});
    await store('cache', { key: 'portfolio-tracking-job', data: { status: 'failed', market, startedAt: now.toISOString(), errors: result.errors } }).catch(() => {});
    return { status: 'failed', result };
  }
}

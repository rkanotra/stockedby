import { instrumentId, marketOf, WATCH, quoteState } from './domain.js';
import { technicalObservations } from './indicators.js';
import { fetchFX, fetchInstrument, keepLastValid } from './feeds.js';
import { runResearch, researchKey, eventAlerts } from './research.js';
import { fetchNews } from './news.js';

export function scheduledWindow(window, now = new Date()) {
  if (!['asia', 'global'].includes(window)) throw Error('Unknown scan window.');
  const hour = now.getUTCHours(), expected = window === 'asia' ? 6 : 15;
  if (hour !== expected) throw Error('Outside the scheduled scan hour.');
  return `scheduled:${window}:${now.toISOString().slice(0, 10)}`;
}
export async function scan(store, { kind = 'refresh', market = 'All', security = null, key, personalFeed = false, now = new Date(), deadlineMs = 220000 } = {}, dependencies = {}) {
  const start = Date.now();
  const reservation = await store('begin', { key: key || `manual:${kind}:${market}:${security || ''}:${Math.floor(now.getTime() / 60000)}`, kind });
  if (reservation.existing) return { existing: true, status: reservation.status, result: reservation.result };
  const result = { kind, market, startedAt: now.toISOString(), errors: [], refreshed: 0, research: [], calendar: 'Exchange calendars unavailable. No open/closed status inferred. Research checks dated sources.' }, alerts = [];
  try {
    const state = await store('load'), positions = state.document.positions || [], cache = { ...state.cache };
    try { cache.wire = await (dependencies.fetchNews || fetchNews)(cache.wire); await store('cache', { key: 'wire', data: cache.wire }); if (cache.wire.failures?.length) result.errors.push(...cache.wire.failures); } catch { result.errors.push('News wire refresh failed; previous headlines retained.'); }
    if (!cache.fx?.fetchedAt || now.getTime() - Date.parse(cache.fx.fetchedAt) > 24 * 3600000) {
      try { cache.fx = await (dependencies.fetchFX || fetchFX)(); await store('cache', { key: 'fx', data: cache.fx }); } catch (e) { result.errors.push(e.message); }
    }
    const relevant = [...positions, ...(state.document.watchlist || [])].filter(p => !p.archived && (market === 'All' || (market === 'Asia' ? ['India','UAE'].includes(marketOf(p)) : market === 'Global' ? ['US','Metals','Crypto'].includes(marketOf(p)) : marketOf(p) === market)));
    const instruments = [...new Map([...relevant, ...(personalFeed && ['All','Global','Crypto'].includes(market) ? WATCH.filter(p => p.exchange === 'CRYPTO') : [])].map(p => [instrumentId(p), p])).values()];
    // At most two concurrent providers. Unsupported equities never create external requests.
    for (let i = 0; i < instruments.length; i += 2) {
      if (Date.now() - start > deadlineMs - 90000) { result.errors.push('Price refresh time limit reached. Remaining positions retain their last values.'); break; }
      await Promise.all(instruments.slice(i, i + 2).map(async p => {
        const id = instrumentId(p), previous = cache[id];
        if (previous?.checkedAt && now.getTime() - Date.parse(previous.checkedAt) < 5 * 60000) return;
        let next;
        try { next = keepLastValid(previous, await (dependencies.fetchInstrument || fetchInstrument)(p, { personalFeed })); } catch (e) { next = keepLastValid(previous, null, e.message); }
        cache[id] = next; await store('cache', { key: id, data: next });
        if (next.lastError) { result.errors.push(`${id}: ${next.lastError}`); if (next.consecutiveFailures >= 2 && (!previous?.checkedAt || now.getTime() - Date.parse(previous.checkedAt) >= 3600000)) alerts.push({ key: `coverage:${id}:${now.toISOString().slice(0, 10)}`, data: { type: 'coverage', title: `Data still unavailable for ${p.symbol}`, security: id, impact: next.lastError, publishedAt: now.toISOString() } }); }
        else result.refreshed++;
      }));
    }
    for(const position of positions.filter(p=>!p.archived && p.mapping==='confirmed')) {
      const id=instrumentId(position), data=cache[id];
      if(['missing','stale'].includes(quoteState(data,now.getTime()))) continue;
      for(const observation of technicalObservations(data?.history)) alerts.push({key:`technical:${id}:${observation.date}:${observation.code}`,data:{type:'technical observation',security:id,title:`${position.symbol}: ${observation.title}`,impact:`Calculated from ${data.provider || 'sourced'} completed daily bars dated ${observation.date}. This is an observation, not a trade instruction.`,publishedAt:`${observation.date}T00:00:00Z`,url:data.source,impactType:'Deterministic calculation'}});
    }
    if (kind !== 'refresh') {
      const markets = [market]; // One bounded research request per scheduled window.
      for (const region of markets) {
        if (Date.now() - start > deadlineMs - 45000) { result.errors.push(`${region}: research deferred because this run reached its time limit.`); continue; }
        const context = { kind: kind === 'scheduled' ? 'brief' : kind, market: region, security, positions, cache, settings: state.document.settings, now };
        const cacheKey = `research:${researchKey([context.kind, region, security, positions.filter(p => !p.archived).map(p => [p.exchange,p.symbol,p.mapping,cache[instrumentId(p)]?.ownerSupplied ? cache[instrumentId(p)]?.quote?.asOf : null]), state.document.settings, now.toISOString().slice(0, 10), Math.floor(now.getUTCHours() / 6)])}`;
        try {
          const research = cache[cacheKey] || await (dependencies.runResearch || runResearch)(context);
          if (!cache[cacheKey]) await store('cache', { key: cacheKey, data: research });
          result.research.push({ ...research, reused: !!cache[cacheKey] }); alerts.push(...eventAlerts(research, positions, now.getTime()));
        } catch (e) { result.errors.push(`${region}: ${e.message}`); if (e.usage) (result.failedUsage ||= []).push(e.usage); }
      }
    }
    result.finishedAt = new Date().toISOString();
    const status = result.errors.length ? 'partial' : 'complete';
    await store('finish', { ...reservation, status, result, alerts });
    return { status, result };
  } catch {
    result.errors.push('This run was interrupted. Saved holdings and previous valid prices are unchanged.');
    await store('finish', { ...reservation, status: 'failed', result, alerts: [] }).catch(() => {});
    return { status: 'failed', result };
  }
}

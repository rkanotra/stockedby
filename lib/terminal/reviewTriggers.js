import { researchHoldings } from './dossierData.js';
import { currentHoldingImpacts, holdingKey } from './holdingNews.js';
import { instrumentId, marketOf } from './domain.js';
import { holdingDecision } from './reviewShelf.js';

export const reviewsEnabled = state => state.scheduled === true && state.cache?.['tracking-preferences']?.enabled !== false;

// Work is derived from saved holdings and sourced news; closing the tab or losing
// an invocation cannot discard a new holding. Do not include shares or balances.
export function reviewTrigger(state, position, now) {
  const security = instrumentId(position), prior = holdingDecision(state.cache, security);
  if (!prior) return { security, kind: 'initial' };
  const events = currentHoldingImpacts(state.cache['portfolio-news'], [position], now.getTime())
    .filter(n => n.material === true && n.reportedFact && Date.parse(n.publishedAt) <= now.getTime() && Math.max(Date.parse(n.publishedAt),Date.parse(n.holdingImpacts.find(i=>i.security===holdingKey(position))?.firstSeenAt)||0) > Date.parse(prior.date));
  if (!events.length) return null;
  const triggers = events.map((event, i) => {
    const impact = event.holdingImpacts.find(i => i.security === holdingKey(position));
    return {id:i===0?'trigger':'trigger-'+(i+1),title:event.title,url:event.url,
      publishedAt:event.publishedAt,reportedFact:event.reportedFact,mechanism:impact.mechanism,uncertainty:impact.uncertainty};
  });
  return {security, kind:'news', prior, events:triggers, event:triggers[0]};
}

export function reviewCandidates(state, {market = 'All', preferred = [], now = new Date()} = {}) {
  if (!reviewsEnabled(state)) return [];
  return researchHoldings(state.document.positions)
    .filter(p => market === 'All' || marketOf(p) === market)
    .map(p => ({p, trigger: reviewTrigger(state,p,now), attempt: state.cache['auto-attempt:'+instrumentId(p)]}))
    .filter(x => x.trigger && !(Date.parse(x.attempt?.retryAt) > now.getTime()))
    .sort((a,b) => Number(preferred.includes(b.trigger.security)) - Number(preferred.includes(a.trigger.security)) ||
      (Date.parse(a.attempt?.at)||0) - (Date.parse(b.attempt?.at)||0) ||
      Number(b.trigger.kind==='news') - Number(a.trigger.kind==='news') ||
      (Date.parse(b.trigger.event?.publishedAt)||0) - (Date.parse(a.trigger.event?.publishedAt)||0));
}

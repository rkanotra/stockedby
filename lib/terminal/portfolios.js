import { instrumentId, marketOf } from './domain.js';
import { holdingKey } from './holdingNews.js';

export const PORTFOLIOS = [
  { id: 'US', name: 'US portfolio', currency: 'USD', detail: 'Stocks & mutual funds' },
  { id: 'India', name: 'India portfolio', currency: 'INR', detail: 'Stocks & mutual funds' },
];
export const portfolioRegion = market => ({ Asia: 'India', Global: 'US' })[market] || market;
export const portfolioPositions = (positions = [], market = 'All') => positions.filter(p => market === 'All' || marketOf(p) === portfolioRegion(market));
export const portfolioCurrency = (market, combined = 'USD') => PORTFOLIOS.find(p => p.id === market)?.currency || combined;

// A read-only view. Saves must always merge into the complete account document.
export function portfolioView(state, market) {
  if (market === 'All') return state;
  const positions = portfolioPositions(state.document.positions, market);
  const watchlist = portfolioPositions(state.document.watchlist, market);
  const keys = new Set([...positions, ...watchlist].flatMap(p => [instrumentId(p), holdingKey(p)]));
  return {
    ...state, document: { ...state.document, positions, watchlist },
    alerts: (state.alerts || []).filter(a => keys.has(a.data?.security)),
    // Combined briefs are retained in All portfolios, never relabelled as regional.
    runs: (state.runs || []).filter(r => portfolioRegion(r.result?.market) === market).map(r => ({
      ...r, result: { ...r.result, research: (r.result?.research || []).filter(x => portfolioRegion(x.market || r.result.market) === market) },
    })),
  };
}

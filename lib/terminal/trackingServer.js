import { createHash } from 'node:crypto';
import { automaticResearch } from './automaticResearch.js';
import { trackingHoldings } from './holdingNews.js';
import { reservePortfolioTracking, trackPortfolio } from './portfolioTracking.js';

// Called after holdings are committed. A tracking outage must never turn a
// successful portfolio save into an apparent failure or a duplicate retry.
export async function queuePortfolioTracking(store, state, defer, { enableSchedule = false, preferred = [], market = 'All', secret = process.env.CRON_SECRET, now = new Date() } = {}) {
  const holdings = trackingHoldings(state.document.positions).filter(p => market === 'All' || p.market === market);
  if (!holdings.length) return { status: 'empty', enabled: state.scheduled, message: 'No active holdings in this portfolio to track.' };
  let enabled = state.scheduled, warning = null;
  const paused = state.cache?.['tracking-preferences']?.enabled === false;
  if (enableSchedule && !paused && !enabled) {
    if (!secret) warning = 'Holdings saved. Automatic daily checks are awaiting server configuration.';
    else {
      try { await store('schedule', { enabled: true, hash: createHash('sha256').update(secret).digest('hex') }); enabled = true; }
      catch (e) { warning = `Holdings saved. Daily tracking could not be enabled: ${e.message}`; }
    }
  }
  if (enableSchedule && paused) return { status: 'paused', enabled: false, message: 'Holdings saved. Automatic tracking is paused in Settings.' };
  if (enabled && preferred.length) {
    defer(() => automaticResearch(store, {market, preferred}));
    return {status:'queued', enabled, message:'Holdings saved. Automatic research is queued; you can close this page. News is checked in the scheduled scans.'};
  }
  try {
    const reservation = await reservePortfolioTracking(store, { positions: state.document.positions, market, now });
    if (!reservation.existing) defer(() => trackPortfolio(store, { reservation, market, now }));
    return { status: reservation.existing ? reservation.status : 'running', enabled, warning, message: warning || (enabled ? 'Holdings saved. Checking relevant news now; daily tracking is on.' : 'Holdings saved. Checking relevant news now.') };
  } catch (e) {
    const message = e.status ? e.message : 'The first news check could not start. Try Check now, or wait for the next scheduled scan.';
    await store('cache', { key: 'portfolio-tracking-job', data: { status: 'deferred', startedAt: now.toISOString(), errors: [message] } }).catch(() => {});
    return { status: 'deferred', enabled, warning, message: `Holdings saved. ${message}` };
  }
}

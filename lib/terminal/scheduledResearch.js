import { trackPortfolio } from './portfolioTracking.js';
import { runResearch } from './research.js';
import { runRadar } from './radar.js';

// Runs share the owner's database lease, so keep them sequential. A failed
// portfolio check must not prevent discovery for someone with no priced holdings.
export async function scheduledResearch(store, { market, key }, dependencies = {}) {
  let tracking, radar;
  try {
    tracking = await (dependencies.track || trackPortfolio)(store, { kind: 'scheduled', market, key }, {
      // Leave time for discovery inside the 300-second function deadline.
      runResearch: args => runResearch({ ...args, retry: false }),
    });
  } catch { tracking = { status: 'failed' }; }
  try { radar = await (dependencies.radar || runRadar)(store, { market, key: `${key}:radar` }); }
  catch { radar = { status: 'failed' }; }
  const successful = status => ['complete', 'skipped'].includes(status);
  return {
    status: successful(tracking.status) && successful(radar.status) ? 'complete' : 'partial',
    tracking: tracking.status,
    radar: radar.status,
  };
}

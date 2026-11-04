import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { json } from '@/lib/team/server';
import { scheduledWindow } from '@/lib/terminal/scan';
import { trackPortfolio } from '@/lib/terminal/portfolioTracking';
export const maxDuration = 300;
export async function GET(request) {
  const secret = process.env.CRON_SECRET, header = request.headers.get('authorization') || '';
  if (!secret || secret.length < 40 || header.length !== secret.length + 7 || !timingSafeEqual(Buffer.from(header), Buffer.from(`Bearer ${secret}`))) return json({ error: 'Job authentication required.' }, 401);
  try {
    const window = new URL(request.url).searchParams.get('window'), key = scheduledWindow(window);
    const db = createClient(process.env.STUDIO_SUPABASE_URL, process.env.STUDIO_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const call = async (action, args = {}) => { const { data, error } = await db.rpc('terminal_job', { token: secret, action, args }); if (error) throw Error('Protected scan storage unavailable.'); return data; };
    const owners = await call('owners');
    // Pilot is deliberately bounded. Each portfolio receives one market batch per window.
    if (owners.length > 3) return json({ error: 'Pilot scheduler capacity exceeded. A durable queue is required before adding more scheduled accounts.' }, 503);
    const outcomes = await Promise.allSettled(owners.map(async owner => { const store = (action, args = {}) => call(action, { ...args, ownerId: owner.id }); return trackPortfolio(store, { kind: 'scheduled', market: window === 'asia' ? 'India' : 'US', key }); }));
    return json({ completed: outcomes.filter(o => o.status === 'fulfilled').length, outcomes: outcomes.map(o => o.status === 'fulfilled' ? o.value.status : 'failed') });
  } catch { return json({ error: 'Scheduled scan could not complete. Check the run history and job configuration.' }, 503); }
}

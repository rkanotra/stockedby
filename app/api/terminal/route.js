import { createHash } from 'node:crypto';
import { after } from 'next/server';
import { json, readBody } from '@/lib/team/server';
import { requireTerminalUser, terminalStore, terminalFailure } from '@/lib/terminal/server';
import { normalizeState, importPreview } from '@/lib/terminal/domain';
import { FEED_COVERAGE } from '@/lib/terminal/feeds';
import { trackingIdentity } from '@/lib/terminal/holdingNews';
import { queuePortfolioTracking } from '@/lib/terminal/trackingServer';
export const maxDuration = 300;
export async function GET() {
  try { const { db, user, owner } = await requireTerminalUser(); return json({ ...(await terminalStore(db)('load')), user: { email: user.email, owner }, feeds: FEED_COVERAGE, aiConfigured: !!(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY), schedulerConfigured: !!process.env.CRON_SECRET }); } catch (e) { return terminalFailure(e); }
}
export async function POST(request) {
  try {
    const { db, owner } = await requireTerminalUser(), body = await readBody(request, 1800000), store = terminalStore(db);
    if (body.action === 'save') {
      const previous = await store('load'), document = normalizeState(body.document);
      const saved = await store('save', { document, version: body.version });
      const changed = trackingIdentity(document.positions) !== trackingIdentity(previous.document.positions);
      const tracking = changed ? await queuePortfolioTracking(store, { ...previous, document }, after, { enableSchedule: true }) : null;
      return json({ ...saved, tracking });
    }
    if (body.action === 'import_preview' || body.action === 'import_commit') {
      const state = await store('load'), preview = importPreview(String(body.csv || ''), state.document.positions);
      if (body.action === 'import_preview') return json({ preview, version: state.version });
      if (body.version !== state.version) return json({ error: 'Your portfolio changed. Preview this import again.' }, 409);
      const rows = preview.filter(r => r.status === 'ready' && Array.isArray(body.rows) && body.rows.includes(r.row));
      if (!rows.length) return json({ error: 'Select at least one ready row.' }, 400);
      const document = normalizeState({ ...state.document, positions: [...state.document.positions, ...rows.map(r => r.position)] });
      const saved = await store('save', { document, version: state.version });
      const tracking = await queuePortfolioTracking(store, { ...state, document }, after, { enableSchedule: true });
      return json({ ...saved, tracking });
    }
    if (body.action === 'track') return json({ tracking: await queuePortfolioTracking(store, await store('load'), after) });
    if (body.action === 'read_alerts') return json(await store('read_alerts'));
    if (body.action === 'schedule') {
      if (!process.env.CRON_SECRET) return json({ error: 'Scheduled scans are awaiting server configuration.' }, 503);
      const enabled = body.enabled === true;
      const result = await store('schedule', { hash: createHash('sha256').update(process.env.CRON_SECRET).digest('hex'), enabled });
      await store('cache', { key: 'tracking-preferences', data: { enabled } });
      const tracking = enabled ? await queuePortfolioTracking(store, await store('load'), after) : null;
      return json({ ...result, tracking });
    }
    if (body.action === 'invite' && owner) return json(await store('invite', { email: String(body.email || '').trim() }));
    return json({ error: 'Unsupported action.' }, 400);
  } catch (e) { return e?.status ? terminalFailure(e) : json({ error: e.message }, 400); }
}

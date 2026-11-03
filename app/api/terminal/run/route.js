import { json, readBody } from '@/lib/team/server';
import { requireTerminalUser, terminalStore, terminalFailure } from '@/lib/terminal/server';
import { scan } from '@/lib/terminal/scan';
export const maxDuration = 300;
export async function POST(request) {
  try { const { db, owner } = await requireTerminalUser(), body = await readBody(request, 3000); if (!['refresh','brief','ideas','review'].includes(body.kind) || !['All','India','UAE','US','Metals','Crypto'].includes(body.market || 'All') || (body.security && !/^[A-Z]+:[A-Z0-9.^&=_/-]{1,40}$/.test(body.security))) return json({ error: 'Choose a scan type, market and security.' }, 400); return json(await scan(terminalStore(db), { kind: body.kind, market: body.market || 'All', security: body.security || null, personalFeed: owner })); } catch (e) { return terminalFailure(e); }
}

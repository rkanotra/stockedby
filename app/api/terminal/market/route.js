import { json, readBody } from '@/lib/team/server';
import { requireTerminalUser, terminalStore, terminalFailure } from '@/lib/terminal/server';
import { instrumentId, WATCH } from '@/lib/terminal/domain';
import { importHistory } from '@/lib/terminal/feeds';
import { fundamentalPreview } from '@/lib/terminal/screener';
export async function POST(request) {
  try {
    const { db } = await requireTerminalUser(), body = await readBody(request, 600000), store = terminalStore(db), state = await store('load');
    if(body.mode==='fundamentals') { const rows=fundamentalPreview(String(body.csv||''));if(!body.confirm)return json({preview:rows});for(const row of rows)await store('cache',{key:`fund:${row.exchange}:${row.symbol}`,data:row});return json({ok:true}); }
    const p = [...state.document.positions, ...(state.document.watchlist||[]), ...WATCH].find(p => instrumentId(p) === body.instrumentId);
    if (!p) return json({ error: 'Add this security before importing its history.' }, 400);
    const data = importHistory(String(body.csv || ''), p, body);
    await store('cache', { key: instrumentId(p), data }); return json({ ok: true });
  } catch (e) { return e?.status ? terminalFailure(e) : json({ error: e.message }, 400); }
}

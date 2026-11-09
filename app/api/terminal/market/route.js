import { json, readBody } from '@/lib/team/server';
import { requireTerminalUser, terminalStore, terminalFailure } from '@/lib/terminal/server';
import { instrumentId, WATCH } from '@/lib/terminal/domain';
import { fetchFX, importHistory, keepLastValid } from '@/lib/terminal/feeds';
import { fetchPrices, findListings, priceIdentity, priceKey } from '@/lib/terminal/prices';
import { fundamentalPreview } from '@/lib/terminal/screener';
export const maxDuration = 300;
export async function POST(request) {
  try {
    const { db } = await requireTerminalUser(), body = await readBody(request, 600000), store = terminalStore(db), state = await store('load');
    if (body.mode === 'find_listing') return json({ listings: await findListings(body) });
    if (body.mode === 'quotes') {
      if (!Array.isArray(body.instruments) || body.instruments.length > 25) return json({ error: 'Request up to 25 investments at a time.' }, 400);
      const instruments = body.instruments.map(priceIdentity).filter(Boolean);
      // Only saved holdings/watchlist quotes may be written to the account cache.
      // Import previews are read-only and never create or confirm a holding.
      const owned = new Set([...state.document.positions, ...(state.document.watchlist || [])].map(priceKey));
      if (body.persist && instruments.some(p => !owned.has(priceKey(p)))) return json({ error: 'Save the holding before refreshing its saved quote.' }, 400);
      const prices = await fetchPrices(instruments);
      if (body.persist) for (const p of instruments) {
        const key = instrumentId(p);
        prices[key] = keepLastValid(state.cache?.[key], prices[key]);
        await store('cache', { key, data: prices[key] });
      }
      if (body.persist && instruments.length && (!state.cache?.fx?.asOf || Date.now() - Date.parse(state.cache.fx.checkedAt || state.cache.fx.fetchedAt) > 6 * 3600000)) {
        try { prices.fx = await fetchFX(); }
        catch { prices.fx = keepLastValid(state.cache?.fx, null, 'FX refresh failed. Last valid rates retained.'); }
        await store('cache', { key: 'fx', data: prices.fx });
      }
      return json({ prices });
    }
    if(body.mode==='fundamentals') { const rows=fundamentalPreview(String(body.csv||''));if(!body.confirm)return json({preview:rows});for(const row of rows)await store('cache',{key:`fund:${row.exchange}:${row.symbol}`,data:row});return json({ok:true}); }
    const p = [...state.document.positions, ...(state.document.watchlist||[]), ...WATCH].find(p => instrumentId(p) === body.instrumentId);
    if (!p) return json({ error: 'Add this security before importing its history.' }, 400);
    const data = importHistory(String(body.csv || ''), p, body);
    await store('cache', { key: instrumentId(p), data }); return json({ ok: true });
  } catch (e) { return e?.status ? terminalFailure(e) : json({ error: e.message }, 400); }
}

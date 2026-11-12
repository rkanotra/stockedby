import { exchangeClock } from '../dashboard/sessions.js';
import { archiveUrl, nseClosingFile } from './nseCloses.js';

// Published files contain a trading date, not an execution time. Internally
// order the EOD observation at the end of the closing session; display only the date.
export async function applyNseCloses(entries, now, fetcher) {
  const ist = stamp => exchangeClock(stamp, 'Asia/Kolkata');
  const today = ist(now);
  const files = new Map();
  const read = date => {
    if (!files.has(date)) files.set(date, nseClosingFile(date, fetcher).catch(() => new Map()));
    return files.get(date);
  };
  return Promise.all(entries.map(async ([p, data]) => {
    if (p.exchange !== 'NSE' || !data.listingVerified || !data.quote || !['equity','etf'].includes(p.assetClass)) return [p, data];
    const observed = ist(Date.parse(data.quote.asOf)).date;
    const dates = new Set([...(today.minute >= 960 ? [today.date] : []), ...(observed < today.date ? [observed] : [])]);
    for (const date of dates) {
      const row = (await read(date)).get(p.symbol.replace(/\.NS$/, ''));
      const end = date+'T10:30:00.000Z';
      if (!row || Date.parse(end) < Date.parse(data.quote.asOf)) continue;
      return [p, { ...data, provider:'NSE India · equity bhavcopy', source:archiveUrl(date),
        quote:{ price:row.close, currency:'INR', quality:'official EOD', asOf:end, session:'Official close' } }];
    }
    return [p,data];
  }));
}

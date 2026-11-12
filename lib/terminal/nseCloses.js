// NSE equity bhavcopy: use the exchange's actual EQ-series closing prices
// when the adjusted-history provider has no usable series (e.g. a recent IPO).
const origin='https://archives.nseindia.com/products/content/';
const months='Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const files=new Map(), inflight=new Map();
const day=86400000;
export function archiveUrl(date) {return origin+'sec_bhavdata_full_'+date.slice(8)+date.slice(5,7)+date.slice(0,4)+'.csv';}
export function parseNseDay(csv,date) {
  const [head,...body]=csv.trim().split(/\r?\n/),columns=head.split(',').map(c=>c.trim());
  const keys=['SYMBOL','SERIES','DATE1','CLOSE_PRICE','TTL_TRD_QNTY'].map(k=>columns.indexOf(k));
  if(keys.includes(-1))throw Error('NSE archive columns changed.');
  const expected=date.slice(8)+'-'+months[Number(date.slice(5,7))-1]+'-'+date.slice(0,4);
  const rows=new Map();
  for(const line of body){const cols=line.split(','),[symbol,series,stamp,price,qty]=keys.map(i=>(cols[i]||'').trim());if(series==='EQ'&&stamp.toLowerCase()===expected.toLowerCase()&&Number.isFinite(Number(price))&&Number(price)>0)rows.set(symbol,{date,close:Number(price),volume:/^\d+$/.test(qty)?Number(qty):null});}
  return rows;
}
export async function nseClosingFile(date,fetcher) {
  const cached=fetcher===fetch;
  if(cached&&files.has(date))return files.get(date);
  if(cached&&inflight.has(date))return inflight.get(date);
  const promise=(async()=>{const r=await fetcher(archiveUrl(date),{cache:'no-store',signal:AbortSignal.timeout(6000)});
    if(!r.ok&&r.status!==404)throw Error('NSE daily archive unavailable.');
    const rows=r.ok?parseNseDay(await r.text(),date):new Map();
    // A recently missing file can arrive late; cache only successful archives.
    if(cached&&rows.size){if(files.size>=30)files.delete(files.keys().next().value);files.set(date,rows);}
    return rows;})();
  if(cached)inflight.set(date,promise);
  try{return await promise;}finally{if(cached)inflight.delete(date);}
}
export async function recentNseCloses(symbol,{now=Date.now(),fetcher=fetch}={}) {
  const dates=Array.from({length:18},(_,i)=>new Date(now-(i+1)*day).toISOString().slice(0,10));
  let cursor=0;const bars=[];
  await Promise.all(Array.from({length:3},async()=>{while(cursor<dates.length){const date=dates[cursor++];try{const row=(await nseClosingFile(date,fetcher)).get(symbol);if(row)bars.push(row);}catch{/* Missing or unpublished dates are not price observations. */}}}));
  bars.sort((a,b)=>a.date.localeCompare(b.date));
  if(bars.length<2)throw Error('Neither the adjusted feed nor the NSE daily archive returned two verified closing prices.');
  return {bars,adjustment:'unknown',returnType:'Exchange closes; corporate-action adjustments are not verified.',provider:'NSE India · equity bhavcopy',source:archiveUrl(bars.at(-1).date),fetchedAt:new Date(now).toISOString()};
}

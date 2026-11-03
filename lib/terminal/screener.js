import { parseCSV, EXCHANGES } from './domain.js';
export const FUNDAMENTAL_HEADER = 'symbol,exchange,asOf,period,basis,pe,roe,revenueGrowth,debtEquity,dividendYield,source';
export function fundamentalPreview(csv, now = Date.now()) {
  return parseCSV(csv).map((r, i) => {
    const symbol=String(r.symbol||'').toUpperCase(),exchange=String(r.exchange||'').toUpperCase();
    if (!/^[A-Z0-9.^&=_/-]{1,40}$/.test(symbol) || !EXCHANGES.includes(exchange) || exchange==='UNRESOLVED') throw Error(`Row ${i+2}: add a valid ticker and exchange.`);
    let url; try { url=new URL(r.source); } catch { throw Error(`Row ${i+2}: add a source URL.`); }
    const date=Date.parse(r.asOf);
    if(url.protocol!=='https:' || !Number.isFinite(date) || date>now || !r.period || !['consolidated','standalone'].includes(r.basis)) throw Error(`Row ${i+2}: add a past as-of date, period and consolidated/standalone basis.`);
    const values={}; for(const k of ['pe','roe','revenueGrowth','debtEquity','dividendYield']) { values[k]=r[k]?.trim() ? Number(r[k]) : null; if(values[k]!==null && (!Number.isFinite(values[k]) || Math.abs(values[k])>1e9)) throw Error(`Row ${i+2}: invalid ${k}.`); }
    return { symbol,exchange,asOf:new Date(date).toISOString(),period:String(r.period).slice(0,80),basis:r.basis,...values,source:url.href,provenance:'User-supplied; verify against the linked filing' };
  });
}
export function screenRows(instruments, cache, filters, now=Date.now()) {
  return instruments.map(p=>({...p,fundamentals:cache[`fund:${p.exchange}:${p.symbol}`]})).filter(p=>{
    const f=p.fundamentals, active=Object.entries({pe:['maxPE',false],roe:['minROE',true],revenueGrowth:['minGrowth',true],debtEquity:['maxDebt',false]}).filter(([, [key]])=>filters[key]!=='' && filters[key]!==null && filters[key]!==undefined);
    if(!active.length)return true;
    if(!f || now-Date.parse(f.asOf)>400*86400000)return false;
    return active.every(([metric,[key,min]])=>f[metric]!==null && Number.isFinite(f[metric]) && (metric!=='pe'||f[metric]>0) && (min ? f[metric]>=Number(filters[key]) : f[metric]<=Number(filters[key])));
  });
}

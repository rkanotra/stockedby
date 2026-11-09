import { instrumentId, marketOf } from './domain.js';
import { priceIdentity, providerSymbol, parseYahooQuote, parseFundQuote } from './prices.js';
import { indicators, validateBars } from './indicators.js';

export const finite = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
const days = (a,b) => (Date.parse(a)-Date.parse(b))/86400000;
const ratio = (a,b) => finite(a)!==null && finite(b)!==null && b>0 ? a/b : null;
const pct = (a,b) => a===null || b===null || b<=0 ? null : (a/b-1)*100;
export function researchHoldings(positions=[]) {
  return [...new Map(positions.filter(p=>!p.archived && Number(p.quantity)>0 && ['India','US'].includes(marketOf(p)) && ['equity','etf','mutual_fund'].includes(p.assetClass)).map(p=>[instrumentId(p),p])).values()];
}
export const dossierKey = p => `dossier:${instrumentId(p)}`;
export function statementRows(raw, symbol, now=Date.now()) {
  const statement=raw?.[symbol];
  if(!Array.isArray(statement?.dates)||!Array.isArray(statement?.data))return [];
  const aliases={revenue:['Total Revenue','Operating Revenue'],operatingIncome:['Operating Income'],netIncome:['Net Income'],eps:['Diluted EPS'],operatingCash:['Operating Cash Flow'],freeCashFlow:['Free Cash Flow'],capex:['Capital Expenditure'],debt:['Total Debt'],cash:['Cash And Cash Equivalents'],equity:['Stockholders Equity'],receivables:['Receivables','Accounts Receivable'],inventory:['Inventory'],shares:['Ordinary Shares Number']};
  return [...new Set(statement.dates)].filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d&&Date.parse(d)<=now).sort().reverse().slice(0,8).map(date=>{
    const row={date};
    for(const [key,names] of Object.entries(aliases))row[key]=names.map(name=>finite(statement.data.find(r=>r.metric===name)?.[date])).find(v=>v!==null)??null;
    return row;
  }).filter(r=>Object.entries(r).some(([k,v])=>k!=='date'&&v!==null));
}
export function mergeStatements(...series) {
  const result=new Map();
  for(const rows of series)for(const row of rows){const old=result.get(row.date)||{date:row.date};for(const [k,v] of Object.entries(row))if(v!==null)old[k]=v;result.set(row.date,old);}
  return [...result.values()].sort((a,b)=>b.date.localeCompare(a.date)).map(r=>{const margin=ratio(r.operatingIncome,r.revenue);return {...r,operatingMargin:margin===null?null:margin*100};});
}
export function financialObservations(annual,quarterly,{financial=false,now=Date.now()}={}) {
  const observations=[], q=quarterly[0], a=annual[0];
  const add=(id,tone,label,value,period)=>{if(value!==null&&Number.isFinite(value))observations.push({id,tone,label,value,period});};
  if(q&&days(new Date(now).toISOString(),q.date)<=190){
    const prior=quarterly.find(r=>days(q.date,r.date)>=345&&days(q.date,r.date)<=385);
    if(prior){
      const growth=pct(q.revenue??null,prior.revenue??null);add('revenue-yoy',growth>=0?'positive':'negative','Quarterly revenue growth YoY',growth,q.date);
      const margin=q.operatingMargin!=null&&prior.operatingMargin!=null?q.operatingMargin-prior.operatingMargin:null;add('margin-yoy',margin>=0?'positive':'negative','Operating margin change YoY (pp)',margin,q.date);
    }
  }
  if(a&&days(new Date(now).toISOString(),a.date)<=550){
    const prior=annual.find(r=>days(a.date,r.date)>=345&&days(a.date,r.date)<=385);
    if(prior){const growth=pct(a.revenue??null,prior.revenue??null);add('annual-revenue',growth>=0?'positive':'negative','Annual revenue growth YoY',growth,a.date);const margin=a.operatingMargin!=null&&prior.operatingMargin!=null?a.operatingMargin-prior.operatingMargin:null;add('annual-margin',margin>=0?'positive':'negative','Annual operating margin change (pp)',margin,a.date);}
    // Cash-flow and debt heuristics are not comparable for banks/insurers.
    if(!financial){const conversion=ratio(a.operatingCash,a.netIncome);add('cash-conversion',conversion>=1?'positive':'neutral','Operating cash / net income',conversion,a.date);if(a.freeCashFlow!=null)add('free-cash-flow',a.freeCashFlow>=0?'positive':'negative','Annual free cash flow',a.freeCashFlow,a.date);}
  }
  return observations;
}
export function dossierChanges(previous,next){
  if(!previous)return ['First evidence snapshot. Future refreshes will show changes here.'];
  const changes=[];
  for(const [key,label] of [['quarterly','Quarterly financials'],['annual','Annual financials']])if(next[key]?.[0]?.date&&next[key][0].date!==previous[key]?.[0]?.date)changes.push(`${label}: period ${next[key][0].date} is now available.`);
  for(const o of next.observations||[]){const old=previous.observations?.find(x=>x.id===o.id);if(old&&old.tone!==o.tone)changes.push(`${o.label}: ${old.tone} → ${o.tone}.`);}
  if(previous.technical?.trend&&next.technical?.trend&&previous.technical.trend!==next.technical.trend)changes.push(`Price trend: ${previous.technical.trend} → ${next.technical.trend}.`);
  if(next.gaps.length)changes.push('Some evidence is incomplete. Missing observations do not mean earlier risks have resolved.');
  return changes.length?changes:['No change in the tracked financial periods or trend categories. This is not an all-clear on investment risk.'];
}
const base='https://yfin-h.tigzig.com/v1';
async function json(url,fetcher){const r=await fetcher(url,{signal:AbortSignal.timeout(25000),cache:'no-store'});if(!r.ok)throw Error('Provider unavailable');const text=await r.text();if(text.length>1500000)throw Error('Provider response too large');return JSON.parse(text);}
export async function fetchDossierEvidence(holding,{fetcher=fetch,now=Date.now()}={}) {
  const p=priceIdentity(holding);if(!p)throw Object.assign(Error('Confirm an exact supported listing or fund scheme first.'),{status:400});
  const fetchedAt=new Date(now).toISOString(),symbol=providerSymbol(p),source=`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/`,gaps=[];
  if(p.exchange==='INMF'){
    const raw=await json(`https://api.mfapi.in/mf/${p.symbol}/latest`,fetcher);
    const nav=parseFundQuote(raw,p,now);
    return {security:instrumentId(p),identity:p,fetchedAt,name:raw.meta.scheme_name,profile:{description:`${raw.meta.fund_house||''} · ${raw.meta.scheme_category||''}`,sector:'Mutual fund'},currency:p.currency,financialCurrency:p.currency,annual:[],quarterly:[],valuation:[],technical:null,observations:[],events:[],sources:[{id:'fund',title:'AMFI NAV via MFapi',url:`https://api.mfapi.in/mf/${p.symbol}/latest`}],fund:{nav:nav.quote.price,navDate:nav.quote.asOf},gaps:['Fund fees, benchmark, portfolio composition and manager history require the latest scheme documents. Company valuation ratios do not apply.']};
  }
  const raw=await json(`${base}/get-detailed-info/?tickers=${encodeURIComponent(symbol)}`,fetcher), info=raw?.[symbol]?.main_info;
  // Exact provider identity check is shared with the current-value calculation.
  const quoted=parseYahooQuote(raw,p,now);
  const equity=p.assetClass==='equity', financial=/financial|bank|insurance/i.test(`${info.sector} ${info.industry}`);
  const requests=equity?['income-statement','cash-flow','balance-sheet','quarterly-income-statement']:[];
  const series={};let cursor=0;
  await Promise.all(Array.from({length:Math.min(2,requests.length)},async()=>{while(cursor<requests.length){const kind=requests[cursor++];try{series[kind]=statementRows(await json(`${base}/excel/get-${kind}/?tickers=${encodeURIComponent(symbol)}`,fetcher),symbol,now);if(!series[kind].length)gaps.push(`${kind}: no usable periods returned.`);}catch{gaps.push(`${kind}: provider unavailable.`);series[kind]=[];}}}));
  const annual=mergeStatements(series['income-statement']||[],series['cash-flow']||[],series['balance-sheet']||[]),quarterly=mergeStatements(series['quarterly-income-statement']||[]);
  if(equity&&(!quarterly[0]||days(fetchedAt,quarterly[0].date)>190))gaps.push('Recent quarterly statements are missing or over 190 days old.');
  if(equity&&(!annual[0]||days(fetchedAt,annual[0].date)>550))gaps.push('Annual statements are missing or over 550 days old.');
  let technical=null;
  try{
    const start=new Date(now-420*86400000).toISOString().slice(0,10),end=new Date(now-86400000).toISOString().slice(0,10);
    const data=await json(`${base}/get-all-prices/?tickers=${encodeURIComponent(symbol)}&start_date=${start}&end_date=${end}`,fetcher);
    const bars=Object.entries(data).filter(([date,bySymbol])=>date<=end&&bySymbol?.[symbol]).map(([date,bySymbol])=>{const r=bySymbol[symbol];return {date,open:r.Open,high:r.High,low:r.Low,close:r.Close,volume:r.Volume};});
    const history=validateBars(bars,'split-adjusted');
    if(!history.bars.length||days(fetchedAt,history.bars.at(-1).date)>7)throw Error('History is stale');
    const t=indicators(history),last=history.bars.at(-1).close;
    technical={...t,trend:t.sma50===null||t.sma200===null?'Insufficient history':last>t.sma50&&t.sma50>t.sma200?'Above the 50- and 200-day averages':last<t.sma50&&t.sma50<t.sma200?'Below the 50- and 200-day averages':'Mixed',basis:'Daily history adjusted for splits and dividends; latest completed sessions only. Not a live quote.',change1m:history.bars.length>21?pct(last,history.bars.at(-22).close):null,series:history.bars.map(b=>({date:b.date,close:b.close})).slice(-90)};
  }catch{gaps.push('Recent adjusted price history unavailable. Technical conclusions withheld.');}
  const valuation=equity?[['Trailing P/E','trailingPE','×'],['Forward P/E · estimate','forwardPE','×'],['Price / book','priceToBook','×'],['EV / EBITDA','enterpriseToEbitda','×'],['Price / sales','priceToSalesTrailing12Months','×']].map(([label,key,unit])=>({label,value:finite(info[key])>0?info[key]:null,unit})):[];
  if(equity)gaps.push('Historical valuation percentile and fair value are not calculated from this limited price history. Multiples are provider-reported, not independently reconciled to filings.');
  else gaps.push('Fund fees, benchmark and underlying holdings require the latest issuer documents. Company financial ratios are not applied to funds.');
  const events=[['Ex-dividend date',info.exDividendDate],['Earnings date · estimate',info.earningsTimestamp]].filter(([,ts])=>finite(ts)!==null&&ts*1000>=now&&ts*1000<now+180*86400000).map(([label,ts])=>({label,date:new Date(ts*1000).toISOString().slice(0,10),status:'Provider calendar; confirm with issuer'}));
  return {security:instrumentId(p),identity:p,fetchedAt,name:quoted.name,currency:p.currency,financialCurrency:typeof info.financialCurrency==='string'?info.financialCurrency:null,quote:quoted.quote,profile:{description:String(info.longBusinessSummary||'').slice(0,3500),sector:String(info.sector||''),industry:String(info.industry||'')},annual,quarterly,valuation,technical,observations:financialObservations(annual,quarterly,{financial,now}),events,sources:[{id:'profile',title:'Company profile and current multiples · Yahoo Finance via TigZig',url:source},{id:'financials',title:'Financial statement periods · Yahoo Finance via TigZig',url:source+'financials/'},{id:'technical',title:'Adjusted daily history · Yahoo Finance via TigZig',url:source+'history/'}],gaps};
}

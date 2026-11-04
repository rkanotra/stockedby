import { sessionHours } from './sessions.js';
// Shared display contract. Provider requests live in quote-feed.js (server only).
export const QUOTE_STORAGE_KEY = 'stockedby-dashboard-quotes-v1';
export const QUOTE_MARKETS = [
  { id: 'SENSEX', name: 'Sensex', category: 'INDIA', note: 'Index points · daily close', tone: 'blue', source: 'TigZig / Yahoo Finance', sourceUrl: 'https://www.tigzig.com/apis/tremor', kind: 'daily' },
  { id: 'XAG', name: 'Silver', category: 'PRECIOUS METALS', note: 'Spot · USD / troy oz', tone: 'gold', source: 'Gold API', sourceUrl: 'https://gold-api.com/', kind: 'spot' },
  { id: 'NASDAQ', name: 'Nasdaq', category: 'UNITED STATES', note: 'Index · latest 5-min bar', tone: 'violet', source: 'XAUS / Yahoo Finance', sourceUrl: 'https://xaus.com/charts/', kind: 'bar' },
  { id: 'XAU', name: 'Gold', category: 'PRECIOUS METALS', note: 'Spot · USD / troy oz', tone: 'gold', source: 'Gold API', sourceUrl: 'https://gold-api.com/', kind: 'spot' },
  { id: 'BTC', name: 'Bitcoin', category: 'CRYPTO', note: 'BTC / USD · indicative', tone: 'peach', source: 'Gold API', sourceUrl: 'https://gold-api.com/', kind: 'spot' },
  { id: 'AEDINR', name: 'AED → INR', category: 'CURRENCY', note: 'Daily reference rate', tone: 'peach', source: 'Rates by Exchange Rate API', sourceUrl: 'https://www.exchangerate-api.com', kind: 'fx' },
];
const DAY = 86400000;
export function validQuote(value, id, now = Date.now()) {
  const market = QUOTE_MARKETS.find(item => item.id === id);
  const time = Date.parse(value?.asOf);
  return !!market && value?.id === id && typeof value.price === 'number' && Number.isFinite(value.price) && value.price > 0 && Number.isFinite(time) && time <= now + 60000 && now - time <= (market.kind === 'spot' ? DAY : market.kind === 'fx' ? 3 * DAY : 7 * DAY);
}
// Keep only validated public quotes. An outage must never turn a missing price
// into zero, erase a usable earlier reading, or silently renew its timestamp.
export function mergeQuotes(previous = [], incoming = [], now = Date.now()) {
  return QUOTE_MARKETS.map(item => {
    const next = incoming.find(quote => quote?.id === item.id);
    const prior = previous.find(quote => quote?.id === item.id);
    if (validQuote(next, item.id, now) && (!validQuote(prior, item.id, now) || Date.parse(next.asOf) >= Date.parse(prior.asOf))) return withObservedMove(next, prior, now);
    if (validQuote(prior, item.id, now)) return { ...prior, stale: true, updateFailed: true };
    return { id: item.id, price: null, asOf: null, updateFailed: true };
  });
}
// Compare like-for-like observations only. This is NOT a daily/24h return.
// Keep the last comparison through a repeated cached response, but only until
// its original time window expires. Never compare across an overnight gap.
export function withObservedMove(next, prior, now = Date.now()) {
  if (!validQuote(next,next?.id,now) || !['XAU','XAG','BTC'].includes(next.id)) return next;
  const time=Date.parse(next.asOf), previousTime=Date.parse(prior?.asOf);
  if(validQuote(prior,next.id,now)&&time>previousTime&&time-previousTime<=15*60000)
    return {...next, movement:{basis:'update',price:prior.price,asOf:prior.asOf}};
  if(time===previousTime&&quoteMovement(prior,now))return {...next,movement:prior.movement};
  return next;
}
export function quoteMovement(quote, now = Date.now()) {
  const ref=quote?.movement, time=Date.parse(quote?.asOf), from=Date.parse(ref?.asOf);
  if(!validQuote(quote,quote?.id,now)||!ref||!['close','session','update'].includes(ref.basis)||!Number.isFinite(ref.price)||ref.price<=0||!Number.isFinite(from)||from>=time)return null;
  if(ref.basis==='update'&&(time-from>15*60000||now-time>5*60000||quote.updateFailed||quote.stale))return null;
  if(time-from>7*86400000)return null;
  const change=quote.price-ref.price, percent=change/ref.price*100;
  const flat=Math.abs(change)<0.005;
  return {change,percent,direction:flat?'flat':change>0?'up':'down',label:ref.basis==='close'?'vs previous close':ref.basis==='session'?'vs prior session’s last bar':'since last update',basis:ref.basis,asOf:ref.asOf};
}
export function quoteSession(item, quote, now = Date.now()) {
  if(['SENSEX','NASDAQ'].includes(item.id))return sessionHours(item.id,now);
  if(item.id==='BTC')return {state:'continuous',label:'24/7 market',detail:'Bitcoin trades around the clock. Quote freshness is shown separately.'};
  if(item.kind==='fx')return {state:'reference',label:'Daily rate',detail:'Daily reference rate, not a live foreign-exchange trading quote.'};
  const updating=validQuote(quote,item.id,now)&&!quoteIsOld(quote,item,now)&&!quote.updateFailed;
  return {state:updating?'updating':'reference',label:updating?'Spot updates':'Last spot',detail:'OTC spot feed; no single exchange open/closed status is supplied. Observation time is shown below.'};
}
export function quoteIsOld(quote, item, now = Date.now()) {
  return !!quote?.stale || now - Date.parse(quote?.asOf) > (item.kind === 'spot' ? 5 * 60000 : item.kind === 'fx' ? 36 * 3600000 : 4 * DAY);
}
export function formatQuotePrice(quote, item) {
  const number = new Intl.NumberFormat(item.id === 'SENSEX' ? 'en-IN' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(quote.price);
  return `${item.kind === 'spot' ? '$' : ''}${number}`;
}
export function quoteTimestamp(quote, item) {
  const date = new Date(quote.asOf);
  return item.kind === 'daily'
    ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date)
    : `${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(date)} UTC`;
}

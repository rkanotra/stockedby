// Scheduled cash-market sessions, not a live exchange/halt-status feed.
// Reviewed 2026-11-04 against the exchange calendars. Unknown calendar years
// deliberately return "Check hours", rather than assuming weekdays are open.
// https://nasdaqtrader.com/Trader.aspx?id=Calendar
// https://www.nasdaq.com/market-activity/stock-market-holiday-schedule
// BSE notice 20251212-8; January election closure also listed by NSE:
// https://www.nseindia.com/resources/exchange-communication-holidays?apiversion=v2
const HOLIDAYS = {
  SENSEX: ['01-15','01-26','03-03','03-26','03-31','04-03','04-14','05-01','05-28','06-26','09-14','10-02','10-20','11-10','11-24','12-25'],
  NASDAQ: ['01-01','01-19','02-16','04-03','05-25','06-19','07-03','09-07','11-26','12-25'],
};
export function exchangeClock(stamp, zone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(stamp)).map(p=>[p.type,p.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,year:parts.year,day:parts.weekday,minute:Number(parts.hour)*60+Number(parts.minute)};
}
export function sessionHours(id, stamp = Date.now()) {
  const india=id==='SENSEX', zone=india?'Asia/Kolkata':'America/New_York';
  const local=exchangeClock(stamp,zone), source=india?'https://www.bseindia.com/static/markets/marketinfo/listholi.aspx':'https://nasdaqtrader.com/Trader.aspx?id=Calendar';
  if(!HOLIDAYS[id]||local.year!=='2026')return {state:'unknown',label:'Check hours',detail:'The exchange calendar for this date has not been verified.',source,...local};
  // The exchange announces a special Muhurat session on this Sunday. Without
  // its verified intraday schedule we must not label it a closed weekend.
  if(india&&local.date==='2026-11-08')return {state:'unknown',label:'Special session',detail:'Muhurat trading today. Check the exchange for special session times.',source,...local};
  const holiday=HOLIDAYS[id].includes(local.date.slice(5)), weekend=['Sat','Sun'].includes(local.day);
  const open=india?555:570, close=india?930:['11-27','12-24'].includes(local.date.slice(5))?780:960;
  const hours=india?'09:15–15:30 IST':close===780?'09:30–13:00 ET':'09:30–16:00 ET';
  const state=!holiday&&!weekend&&local.minute>=open&&local.minute<close?'open':'closed';
  return {state,label:state==='open'?'Open':'Closed',detail:`${holiday?'Exchange holiday. ':weekend?'Weekend. ':''}Scheduled cash session: ${hours}. Does not reflect unscheduled halts.`,source,open,close,holiday,weekend,...local};
}

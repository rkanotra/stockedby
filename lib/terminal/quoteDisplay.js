import { sessionHours } from '../dashboard/sessions.js';
import { usQuoteLabel, supportsUsIntraday } from './usQuotes.js';

const indiaCash = p => ['NSE', 'BSE'].includes(p?.exchange) && ['equity', 'etf'].includes(p.assetClass);

export function quoteLabel(p, quote, status, now = Date.now()) {
  if (!quote || !indiaCash(p)) return usQuoteLabel(p, quote, status);
  if (!['official EOD', 'indicative', 'delayed'].includes(status)) return status;
  const official = status === 'official EOD', session = sessionHours('SENSEX', now);
  if (session.state === 'unknown') return official ? 'Official close' : 'Latest reported quote';
  if (session.state === 'closed') return official ? 'Market closed · official close' : 'Market closed · last quote';
  if (official) return 'Previous official close';
  if (Number.isFinite(Date.parse(quote.asOf)) && sessionHours('SENSEX', Date.parse(quote.asOf)).date !== session.date) return 'Previous session quote';
  return 'Regular session · delayed';
}

export function quoteStamp(p, quote) {
  if (!quote?.asOf || !Number.isFinite(Date.parse(quote.asOf))) return '';
  const fund = p.assetClass === 'mutual_fund', india = indiaCash(p) || p.exchange === 'INMF';
  const us = supportsUsIntraday(p) || p.exchange === 'USMF';
  const timeZone = india ? 'Asia/Kolkata' : us ? 'America/New_York' : 'Asia/Dubai';
  const dayOnly = quote.quality === 'official EOD' || fund;
  const stamp = new Date(quote.asOf).toLocaleString('en-GB', {timeZone, day:'numeric', month:'short',
    ...(dayOnly ? {year:'numeric'} : {hour:'2-digit', minute:'2-digit'})});
  return dayOnly ? stamp : stamp + (india ? ' IST' : us ? ' ET' : ' GST');
}

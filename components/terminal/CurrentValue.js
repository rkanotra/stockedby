'use client';
import { currentValue, priceIdentity } from '@/lib/terminal/prices';
import i from './portfolioImport.module.css';

const money = (value, currency, digits = 2) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: digits }).format(value);
export default function CurrentValue({ position, data, loading, error }) {
  const value = currentValue(position, data), fund = position.assetClass === 'mutual_fund';
  const time = data?.quote?.asOf ? new Date(data.quote.asOf).toLocaleString('en-GB', { dateStyle: 'medium', ...(fund ? { timeZone: position.exchange === 'USMF' ? 'America/New_York' : 'UTC' } : { timeStyle: 'short' }) }) : '';
  return <div className={i.currentValue} aria-label={`Current value for ${position.name || position.symbol || 'holding'}`}>
    <span>Current value <small>Calculated automatically</small></span>
    <output>{value !== null ? money(value, position.currency) : loading && priceIdentity(position) ? 'Fetching price…' : 'Not available yet'}</output>
    {value !== null ? <><p>{money(data.quote.price, position.currency, 6)} {fund ? 'NAV' : 'per share'} × {position.quantity} {fund ? 'units' : 'shares'}</p><strong>{data.name}</strong><p>{position.exchange} · {position.symbol} · {data.quote.quality} · {time}{!fund && ` (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}</p><a href={data.source} target="_blank" rel="noreferrer">{data.provider} ↗</a>{data.lastError && <p>{data.lastError} Showing the last valid quote.</p>}</> : <p>{!priceIdentity(position) ? fund && position.currency === 'INR' ? 'Use “Find a ticker or fund scheme” to choose the exact Indian fund plan.' : 'Choose the currency and asset type, then use “Find a ticker or fund scheme” to match this investment.' : error || data?.unavailable || 'Enter your quantity. A missing price will not prevent you from saving.'}</p>}
  </div>;
}

'use client';
import { ASSET_LABELS, exchangeLabel } from '@/lib/terminal/domain';
import { quoteLabel, supportsUsIntraday } from '@/lib/terminal/usQuotes';
import d from './desk.module.css';

const money=(n,c)=>n==null?'—':new Intl.NumberFormat(c==='INR'?'en-IN':'en-GB',{style:'currency',currency:c,maximumFractionDigits:2}).format(n);
export default function HoldingsList({rows,currency,archived,busy,onSelect,onEdit,onArchive,onNews,onResearch}) {
  if(!rows.length)return <div className={d.noHoldings}><h3>{archived?'No archived positions':'No matching positions'}</h3><p>{archived?'Positions you archive will appear here.':'Try another search or market, or add your first holding.'}</p></div>;
  const actions=p=><div className={d.rowActions}>{!archived&&onResearch&&<button onClick={()=>onResearch(p)}>Research</button>}{!archived&&onNews&&<button onClick={()=>onNews(p)}>News</button>}<button onClick={()=>onEdit(p)}>Edit</button><button disabled={busy} onClick={()=>onArchive(p)}>{archived?'Restore':'Archive'}</button></div>;
  const name=p=><button className={d.holdingName} onClick={()=>onSelect(p)}><span className={d.assetAvatar}>{p.symbol.slice(0,2)}</span><span><strong>{p.symbol}</strong><small>{p.listingName||p.name}</small><small>{ASSET_LABELS[p.assetClass]} · {exchangeLabel(p.exchange)} · {p.account}{p.lot?` / ${p.lot}`:''}</small></span></button>;
  const pnlClass=p=>p.pnl==null?d.neutral:p.pnl<0?d.negative:d.positive;
  function coverage(p) {
    const us = supportsUsIntraday(p);
    const zone = us ? 'America/New_York' : 'Asia/Dubai';
    const timestamp = p.quote?.asOf && new Date(p.quote.asOf).toLocaleString('en-GB', {
      timeZone: zone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
    }) + (us ? ' ET' : ' GST');
    let label = quoteLabel(p, p.quote, p.status) || 'Not priced';
    if (p.status === 'missing') label = p.assetClass === 'mutual_fund' ? 'NAV unavailable' : 'Price unavailable';
    return <>
      {p.status === 'unresolved' && !archived
        ? <button className={d.coverageBadge} onClick={()=>onEdit(p)}>Choose listing →</button>
        : <span className={d.coverageBadge}>{archived ? 'Archived' : label}</span>}
      <small>{timestamp || 'No quote yet'}</small>
      {p.automaticallyMatched && <small>Listing matched automatically</small>}
      {p.priceSource && <small><a href={p.priceSource} target="_blank" rel="noreferrer">Price source ↗</a></small>}
      {p.priceError && <small>{p.priceError}</small>}
    </>;
  }
  const calculation=p=>p.nativeValue!=null&&<small>{money(p.quote.price,p.currency)} × {p.quantity} {p.unit} = {money(p.nativeValue,p.currency)}</small>;
  const snapshot=p=>p.snapshotValue!=null&&<details><summary>Imported snapshot</summary><small>{money(Number(p.snapshotValue),p.currency)} · {p.snapshotAt&&Number.isFinite(Date.parse(p.snapshotAt))?new Date(p.snapshotAt).toLocaleDateString('en-GB'):'date not supplied'}. Not a current quote.</small></details>;
  return <>
    <div className={d.holdingsDesktop}><table><caption>Your private holdings. Missing values are unavailable, not zero.</caption><thead><tr><th>Investment</th><th>Quantity / cost</th><th>Current value</th><th>Unrealized P&L</th><th>Price coverage</th><th><span className={d.visuallyHidden}>Actions</span></th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td>{name(p)}</td><td><strong>{p.quantity}</strong><small>{p.unit}</small><small>Cost: {p.costBasis==null?'Unknown':money(Number(p.costBasis),p.currency)}</small></td><td><strong>{money(p.value,currency)}</strong>{calculation(p)}<small>{p.weight==null?'—':`${(p.weight*100).toFixed(1)}% of priced value`}</small>{snapshot(p)}</td><td className={pnlClass(p)}><strong>{money(p.pnl,currency)}</strong><small>Realized: {p.realizedPnl==null?'—':money(Number(p.realizedPnl),p.currency)}</small><small>Broker: {p.brokerPnl==null?'—':money(Number(p.brokerPnl),p.currency)}</small></td><td>{coverage(p)}</td><td>{actions(p)}</td></tr>)}</tbody></table></div>
    <div className={d.holdingsMobile}>{rows.map(p=><article key={p.id}><div className={d.mobileHoldingHead}>{name(p)}<strong>{money(p.value,currency)}</strong></div><dl><div><dt>Quantity</dt><dd>{p.quantity} {p.unit}</dd></div><div><dt>Unrealized P&L</dt><dd className={pnlClass(p)}>{money(p.pnl,currency)}</dd></div><div><dt>Cost basis</dt><dd>{p.costBasis==null?'Unknown':money(Number(p.costBasis),p.currency)}</dd></div><div><dt>Realized / broker P&L</dt><dd>{money(p.realizedPnl==null?null:Number(p.realizedPnl),p.currency)} / {money(p.brokerPnl==null?null:Number(p.brokerPnl),p.currency)}</dd></div></dl>{calculation(p)}{snapshot(p)}<footer><div>{coverage(p)}</div>{actions(p)}</footer></article>)}</div>
  </>;
}

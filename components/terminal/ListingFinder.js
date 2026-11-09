'use client';
import { useState } from 'react';
import i from './portfolioImport.module.css';
export default function ListingFinder({ position, onChoose }) {
  const [query,setQuery] = useState(position.name || position.symbol || ''), [listings,setListings] = useState(null), [busy,setBusy] = useState(false), [error,setError] = useState('');
  async function search() {
    if(busy)return;
    setBusy(true);setError('');setListings(null);
    try {
      const response=await fetch('/api/terminal/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'find_listing',query,currency:position.currency,assetClass:position.assetClass})});
      const data=await response.json();if(!response.ok)throw Error(data.error || 'Listing search is unavailable.');setListings(data.listings || []);
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <details className={i.listingFinder}><summary>Find a ticker or fund scheme</summary><label>Company or fund to look up<input value={query} maxLength={120} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();search();}}}/></label><button type="button" disabled={busy || query.trim().length<2} onClick={search}>{busy?'Finding listings…':'Find matching listings'}</button><p>Choose the exact investment. For funds, match Direct / Regular and Growth / distribution.</p>{error&&<p role="alert">{error}</p>}{listings?.length===0&&<p>No matching listing found. Try a shorter company or fund name.</p>}{listings?.map(p=><button className={i.listingOption} type="button" key={`${p.exchange}:${p.symbol}`} onClick={e=>{onChoose(p);e.currentTarget.closest('details').open=false;}}><strong>{p.name}</strong><span>{p.exchange} · {p.symbol} · {p.currency} →</span></button>)}</details>;
}

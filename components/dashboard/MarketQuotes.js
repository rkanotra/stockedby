'use client';
import { useEffect, useState } from 'react';
import { QUOTE_MARKETS, QUOTE_STORAGE_KEY, mergeQuotes, validQuote, quoteIsOld, formatQuotePrice, quoteTimestamp, quoteMovement, quoteSession } from '@/lib/dashboard/quotes';
import s from './pulse.module.css';

export default function MarketQuotes({ refresh, offline }) {
  const [quotes,setQuotes]=useState([]),[loading,setLoading]=useState(true),[attempt,setAttempt]=useState(0),[now,setNow]=useState(Date.now),[amount,setAmount]=useState('1');
  useEffect(()=>{
    let active=true,controller,inFlight=false;
    const load=async()=>{
      if(document.hidden||!navigator.onLine)return;
      if(inFlight)return;
      inFlight=true;controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),15000);
      try{
        const response=await fetch('/api/market-news?view=quotes',{signal:controller.signal,cache:'no-store'});
        if(!response.ok)throw Error('Quote connection unavailable');
        const data=await response.json();
        if(data.version!==1||!Array.isArray(data.quotes)||!data.quotes.length)throw Error('Invalid quote response');
        if(active){
          setQuotes(previous=>mergeQuotes(previous,data.quotes));
          setNow(Date.now());
        }
      }catch{if(active)setQuotes(previous=>mergeQuotes(previous,[]));}
      finally{clearTimeout(timeout);inFlight=false;if(active)setLoading(false);}
    };
    const restore=async()=>{
      try{
        const saved=JSON.parse(localStorage.getItem(QUOTE_STORAGE_KEY)||'null');
        if(saved?.version===1&&Array.isArray(saved.quotes))setQuotes(previous=>previous.length?previous:mergeQuotes(saved.quotes,[]));
      }catch{}
      await load();
      if(active&&!navigator.onLine)setLoading(false);
    };
    restore();
    const timer=setInterval(load,60000);
    const ageTimer=setInterval(()=>setNow(Date.now()),30000);
    const visible=()=>{if(!document.hidden)load();};
    document.addEventListener('visibilitychange',visible);
    return()=>{active=false;controller?.abort();clearInterval(timer);clearInterval(ageTimer);document.removeEventListener('visibilitychange',visible);};
  },[refresh,attempt]);
  useEffect(()=>{
    if(quotes.some(quote=>validQuote(quote,quote?.id)))try{localStorage.setItem(QUOTE_STORAGE_KEY,JSON.stringify({version:1,quotes}));}catch{}
  },[quotes]);
  const retry=()=>{setLoading(true);setAttempt(n=>n+1);};
  return <section className={s.markets} aria-label="Market values">
    {QUOTE_MARKETS.map(item=>{
      const quote=quotes.find(value=>value?.id===item.id),available=validQuote(quote,item.id,now);
      const earlier=available&&(offline||quoteIsOld(quote,item,now)||quote.updateFailed);
      const observedQuote=offline?{...quote,updateFailed:true}:quote;
      const movement=quoteMovement(observedQuote,now),session=quoteSession(item,observedQuote,now);
      const direction=movement?.direction||'unknown';
      const signed=(value)=>`${value>0?'+':value<0?'−':''}${new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Math.abs(value))}`;
      if(item.kind==='fx'){
        const numeric=amount.trim()===''?null:Number(amount),canConvert=available&&Number.isFinite(numeric)&&numeric>=0&&numeric<=1e9;
        return <article key={item.id} className={s.fxTile} aria-label="AED to INR conversion" data-feed-state={available?earlier?'stale':'ready':loading?'loading':'unavailable'}>
          <div className={s.fxConversion}><label><span>AED</span><input aria-label="Amount in AED" type="number" inputMode="decimal" min="0" max="1000000000" step="any" value={amount} onChange={event=>setAmount(event.target.value)}/></label><span aria-hidden="true">→</span><output aria-label="Converted amount in INR">{canConvert?new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(numeric*quote.price):'—'} <small>INR</small></output></div>
          <div className={s.fxMeta}>{available?<span>{earlier?'Saved rate':'Daily rate'} · {quoteTimestamp(quote,item)}</span>:<span>{loading?'Fetching exchange rate…':<button onClick={retry}>Retry exchange rate</button>}</span>}<a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source}</a></div>
        </article>;
      }
      return <article key={item.id} className={`${s.tile} ${s[item.tone]}`} aria-label={`${item.name} quote`} data-direction={direction}>
        <header><span className={s.category}>{item.category}</span><a href={item.sourceUrl} target="_blank" rel="noreferrer" title={item.source} aria-label={`Open ${item.name} at source`}>↗</a></header>
        <div className={s.instrument}><h2>{item.name}</h2><span className={s.session} data-session={session.state} title={session.detail} aria-label={`${item.name}: ${session.label}. ${session.detail}`}><i/>{session.label}</span></div>
        <div className={s.quote} data-feed-state={available?earlier?'stale':'ready':loading?'loading':'unavailable'}>
          {available?<div className={s.nativeQuote}>
            <strong key={quote.asOf} className={s.price}>{formatQuotePrice(quote,item)}</strong>
            <div className={s.movement} aria-label={movement?`${item.name} ${direction==='up'?'up':direction==='down'?'down':'unchanged'} ${Math.abs(movement.percent).toFixed(2)} percent ${movement.label}`:`${item.name}: comparison not yet available`}>
              {movement?<><strong><span aria-hidden="true">{direction==='up'?'▲':direction==='down'?'▼':'→'}</span> {direction==='flat'?'0.00':signed(movement.change)} <span>({direction==='flat'?'0.00':Math.abs(movement.percent)<0.005?`${movement.percent<0?'−':'+'}<0.01`:signed(movement.percent)}%)</span></strong><small><span className={s.fullBasis}>{movement.label}</span><span className={s.compactBasis}>{movement.basis==='close'?'prev. close':movement.basis==='session'?'prev. session':'last update'}</span></small></>:<><strong className={s.pendingMove}>—</strong><small>{item.kind==='spot'?'Comparing next update':'Comparison unavailable'}</small></>}
            </div>
            <span className={earlier?s.earlier:s.quoteTiming}>{earlier?'Saved value · ':item.kind==='daily'?'Close · ':''}<time dateTime={quote.asOf}>{quoteTimestamp(quote,item)}</time></span>
          </div>:<div className={s.quotePlaceholder}>{loading?<span>Fetching prices…</span>:<div className={s.feedError}><span>{offline?'Offline · no saved price':'Source temporarily unavailable'}</span><div><button onClick={retry} aria-label={`Retry ${item.name} price`}>Retry</button><a href={item.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a></div></div>}</div>}
        </div>
        <p className={s.quoteNote}>{item.note}</p><a className={s.quoteSource} href={item.sourceUrl} target="_blank" rel="noreferrer">{item.source}</a>
      </article>;
    })}
  </section>;
}

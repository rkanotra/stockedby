'use client';
import { useEffect, useState } from 'react';
import { indicators } from '@/lib/terminal/indicators';
import { bestSeries } from '@/lib/terminal/seriesCache';
import s from './terminal.module.css';

// Results belong to a single listing. Late responses from a previous selection
// must never supply another holding's prices or benchmark.
function useSeries(id, saved, imported, now) {
  const [result,setResult]=useState(null),[attempt,setAttempt]=useState(0);
  const t=saved?.technical;
  const seeded=t?.adjustment && t.series?.length>1 ? {bars:t.series,adjustment:t.adjustment,provider:t.provider,source:t.source,returnType:t.basis,fetchedAt:saved.fetchedAt} : null;
  const initial=bestSeries(imported,seeded);
  const today=new Date(now).toISOString().slice(0,10);
  const current=initial?.fetchedAt?.slice(0,10)===today&&initial.bars.at(-1).date>=new Date(now-7*86400000).toISOString().slice(0,10);
  useEffect(()=>{
    if(!id||(!attempt&&current))return;
    const controller=new AbortController();let active=true;
    (async()=>{
      try{
        const response=await fetch('/api/terminal/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:'history',instrumentId:id}),signal:controller.signal,cache:'no-store'});
        const data=await response.json();
        if(!response.ok||data.instrumentId!==id||!data.history?.bars?.length)throw Error(data.error||'Daily history could not be loaded.');
        if(active)setResult({id,attempt,history:data.history});
      }catch(e){if(active)setResult({id,attempt,error:e.message||'The daily history source did not respond.'});}
    })();
    return()=>{active=false;controller.abort();};
  },[id,attempt,current,today]);
  const own=result?.id===id&&result.attempt===attempt?result:null;
  const fetched=own?.history,history=bestSeries(fetched,initial);
  return {history,error:own?.error,retry:()=>setAttempt(x=>x+1),waiting:!!id&&!own&&!current};
}
export default function MarketSeries({security,currency,benchmark,cache,Chart,onResearch}) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60000);return()=>clearInterval(timer);},[]);
  const getSaved=id=>cache['dossier:'+id]?.evidence;
  const getHistory=id=>{const q=cache[id];return bestSeries(cache['market-series:'+id],q?.history&&{...q.history,provider:q.history.provider||(q.ownerSupplied?q.provider:'Saved history'),source:q.history.source||(q.ownerSupplied?q.source:null),fetchedAt:q.history.fetchedAt||(q.ownerSupplied?q.fetchedAt:null)});};
  const stock=useSeries(security,getSaved(security),getHistory(security),now);
  const other=useSeries(benchmark===security?'':benchmark,getSaved(benchmark),getHistory(benchmark),now);
  const {history}=stock,metrics=indicators(history),metricsList=[['SMA 20',metrics.sma20],['SMA 50',metrics.sma50],['SMA 200',metrics.sma200],['RSI 14',metrics.rsi14],['Volume / prior 20',metrics.relativeVolume]];
  const stale=history&&now-Date.parse(metrics.end)>7*86400000;
  return <><section className={s.panel} aria-label={'Price history for '+security}><div className={s.panelHead}><h2>Price history</h2><span>{security}</span></div>
    {history?<Chart key={security+'|'+benchmark} data={{history,currency,provider:history.provider}} benchmark={{history:benchmark===security?null:other.history}}/>:<p role="status">{stock.waiting?'Loading completed daily prices…':stock.error||'No verified daily history is available.'}</p>}
    {stock.error&&<p>{history?'Showing saved history. ':''}<button onClick={stock.retry}>Retry daily history</button></p>}
    {other.error&&benchmark!==security&&<p className={s.fine}>{benchmark}: comparison history unavailable. <button onClick={other.retry}>Retry comparison</button></p>}
    {stale&&<p className={s.notice}>Last available chart session: {metrics.end}. These prices may be stale.</p>}
    </section><section className={s.panel}><div className={s.panelHead}><h2>Technical observations</h2><span>{history?metrics.start+' → '+metrics.end:security}</span></div>
    {history&&!stale&&metricsList.some(([,v])=>v!==null)&&<div className={s.indicators}>{metricsList.filter(([,v])=>v!==null).map(([label,v])=><div key={label}><span>{label}</span><strong>{v.toLocaleString('en-GB',{maximumFractionDigits:2})}{label.startsWith('Volume')?'×':''}</strong></div>)}</div>}
    <p className={s.fine}>{!history?(stock.waiting?'Waiting for dated trading sessions.':'Indicators need verified daily history.'):stale?'Current indicators are withheld until prices update.':metricsList.some(([,v])=>v===null)?metrics.count+' verified sessions. '+metrics.reason:'Based on '+metrics.count+' completed sessions. Averages use daily closes; relative volume compares the last session with the preceding 20.'}</p>
    {onResearch&&<button onClick={onResearch}>Open company research →</button>}</section></>;
}

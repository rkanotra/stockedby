'use client';
import { useState } from 'react';
import c from './portfolioResearch.module.css';
const fmt=v=>new Intl.NumberFormat('en-GB',{maximumFractionDigits:2}).format(v);
export default function ResearchChart({technical,currency}){
 const [period,setPeriod]=useState(126),[cursor,setCursor]=useState(null),[averages,setAverages]=useState(true);
 const all=technical?.series||[], rows=all.slice(-period), offset=all.length-rows.length;
 if(!rows.length)return <div className={c.chartEmpty}>Price history has not arrived yet. Refresh evidence to connect the chart.</div>;
 const raw=technical?.adjustment==='unknown';
 const avg=(i,n)=>raw?null:i+1<n?null:all.slice(i+1-n,i+1).reduce((s,r)=>s+r.close,0)/n;
 const points=rows.map((r,i)=>({...r,sma50:avg(i+offset,50),sma200:avg(i+offset,200)}));
 const vals=points.flatMap(p=>[p.close,...(averages?[p.sma50,p.sma200].filter(v=>v!==null):[])]),lo=Math.min(...vals),hi=Math.max(...vals),range=hi-lo||1;
 const x=i=>16+i/(points.length-1||1)*700,y=v=>22+(hi-v)/range*195;
 const line=k=>points.map((p,i)=>p[k]===null?'':`${i===0||points[i-1][k]===null?'M':'L'}${x(i)},${y(p[k])}`).join(' ');
 const index=Math.min(cursor??points.length-1,points.length-1),p=points[index],change=(rows.at(-1).close/rows[0].close-1)*100,volume=Math.max(1,...rows.map(r=>r.volume||0));
 return <section className={c.chart} aria-label="Price history"><div className={c.chartHead}><div><span className={c.eyebrow}>PRICE HISTORY · {currency}</span><strong>{fmt(p.close)} <small className={change>=0?c.up:c.down}>{change>=0?'+':''}{fmt(change)}% in view</small></strong><small>{p.date} · {raw?'exchange close':'adjusted close'}</small></div><div className={c.chartTools}>{[[21,'1M'],[63,'3M'],[126,'6M'],[300,'All']].map(([n,label])=><button aria-pressed={period===n} key={n} onClick={()=>{setPeriod(n);setCursor(null);}}>{label}</button>)}</div></div><svg viewBox="0 0 780 290" role="img" tabIndex={0} aria-label="Historical closing prices. Use left and right arrows to inspect prices." onPointerMove={e=>{const b=e.currentTarget.getBoundingClientRect();setCursor(Math.max(0,Math.min(points.length-1,Math.round(((e.clientX-b.left)/b.width*780-16)/700*(points.length-1)))));}} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setCursor(Math.max(0,Math.min(points.length-1,index+(e.key==='ArrowRight'?1:-1))));}}}>
 {[0,1,2,3].map(i=><g key={i}><line x1="16" x2="716" y1={22+i*65} y2={22+i*65} stroke="var(--sb-line)"/><text x="726" y={26+i*65} fontSize="10" fill="var(--sb-muted)">{fmt(hi-i*range/3)}</text></g>)}
 {points.map((r,i)=>r.volume!=null&&<rect key={r.date} x={x(i)} y={269-r.volume/volume*32} width={Math.max(1,650/points.length)} height={r.volume/volume*32} fill="var(--sb-line)"/>)}
 <path d={line('close')} fill="none" stroke="var(--sb-text)" strokeWidth="2.6"/>{averages&&<><path d={line('sma50')} fill="none" stroke="#db7c50" strokeWidth="1.7"/><path d={line('sma200')} fill="none" stroke="#8c83c4" strokeWidth="1.7" strokeDasharray="5 4"/></>}
 <line x1={x(index)} x2={x(index)} y1="16" y2="270" stroke="var(--sb-muted)" strokeDasharray="3 4"/><circle cx={x(index)} cy={y(p.close)} r="4" fill="var(--sb-text)"/><text x="16" y="287" fontSize="10" fill="var(--sb-muted)">{rows[0].date}</text><text x="645" y="287" fontSize="10" fill="var(--sb-muted)">{rows.at(-1).date}</text></svg><div className={c.chartLegend}>{!raw&&all.length>=50&&<button aria-pressed={averages} onClick={()=>setAverages(!averages)}>{all.length>=200?'50 / 200-day averages':'50-day average'} {averages?'on':'off'}</button>}<small>{rows.length} sessions · volume below · {raw?'unadjusted exchange history':'adjusted closing prices'}</small></div></section>;
}
export function FinancialChart({rows=[],currency}){
 const series=[...rows].slice(0,5).reverse(),max=Math.max(1,...series.flatMap(r=>[Math.abs(r.revenue||0),Math.abs(r.netIncome||0)]));
 if(!series.length)return null;
 return <section className={c.financialChart}><div className={c.chartHead}><div><span className={c.eyebrow}>QUARTERLY PERFORMANCE</span><h3>Growth, with context.</h3></div><small>{currency} · revenue / net income</small></div><div className={c.bars}>{series.map(r=><div key={r.date}><div className={c.barPair}><span title={`Revenue: ${r.revenue==null?'unavailable':fmt(r.revenue)}`} style={{height:`${Math.abs(r.revenue||0)/max*100}%`}}/><span title={`Net income: ${r.netIncome==null?'unavailable':fmt(r.netIncome)}`} style={{height:r.netIncome==null?'0':`${Math.max(2,Math.abs(r.netIncome)/max*100)}%`,background:r.netIncome<0?'var(--sb-down)':undefined}}/></div><small>{r.date.slice(0,7)}</small><b>{r.revenue==null?'—':new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(r.revenue)}</b><small>Profit {r.netIncome==null?'—':new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(r.netIncome)}</small></div>)}</div><p className={c.fine}>Bars show absolute amounts; losses are red. Revenue growth can include acquisitions. See the review for organic growth and margin context.</p></section>;
}

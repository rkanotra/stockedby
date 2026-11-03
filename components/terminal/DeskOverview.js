'use client';
import DeskIcon from './DeskIcon';
import { COLORS } from '@/lib/terminal/domain';
import d from './desk.module.css';

const money=(n,c)=>n==null?'—':new Intl.NumberFormat(c==='INR'?'en-IN':'en-GB',{style:'currency',currency:c,maximumFractionDigits:2}).format(n);
const percent=n=>`${(n*100).toFixed(1)}%`;

export default function DeskOverview({portfolio,currency,state,onImport,onAdd,onGo,onSelect}) {
  const empty=!portfolio.count;
  const latest=state.runs.find(run=>run.result?.research?.length);
  const pending=portfolio.count-portfolio.priced;
  return <div className={d.overviewGrid}>
    <div>
      {empty?<section className={d.welcome}>
        <div className={d.welcomeTag}><DeskIcon type="Lock" size={15}/> YOUR PRIVATE PORTFOLIO</div>
        <h2>Your investments.<br/>One clear view.</h2>
        <p>Drop in a screenshot from Wio or ICICI Direct. Let AI read your holdings, then make them yours.</p>
        <div className={d.actions}><button className={d.orangeButton} onClick={onImport}><DeskIcon type="Upload" size={17}/> Import portfolio</button><button className={d.textButton} onClick={onAdd}>Add a position <DeskIcon type="Arrow" size={16}/></button></div>
        <div className={d.welcomeMarkets}><span>IN</span><span>US</span><small>Across markets. All yours.</small></div>
      </section>:<section className={d.balanceCard}>
        <div className={d.cardEyebrow}>YOUR PRICED HOLDINGS <span>{currency}</span></div>
        <strong className={d.balance}>{money(portfolio.total,currency)}</strong>
        <p className={portfolio.pnl==null?d.neutral:portfolio.pnl<0?d.negative:d.positive}>{portfolio.pnl==null?'Return unavailable':`${portfolio.pnl>=0?'+':''}${money(portfolio.pnl,currency)}`} <span>unrealized P&L · translated</span></p>
        <div className={d.balanceMetrics}><div><b>{portfolio.count}</b><span>Active positions</span></div><div><b>{portfolio.concentration==null?'—':percent(portfolio.concentration)}</b><span>Largest priced position</span></div><div><b>{portfolio.pnlCount}</b><span>Priced with known cost</span></div></div>
        <div className={d.coverageTrack}><span style={{width:`${portfolio.count?portfolio.priced/portfolio.count*100:0}%`}}/></div>
        <div className={d.coverageLabel}><span>{portfolio.priced} of {portfolio.count} positions priced</span><button onClick={()=>onGo('Portfolio')}>{pending?`${pending} need attention`:'View holdings'} <DeskIcon type="Arrow" size={14}/></button></div>
        <small>Unpriced holdings are excluded from this total. Available FX rates are used for translation.</small>
      </section>}
      {empty?<section className={d.startSteps}><h2>A simple place to start.</h2>{[
        ['01','Bring what you own','Upload a screenshot or CSV. Review, then confirm.','Import holdings',onImport],
        ['02','Set your perspective','Add your investment horizon and risk preferences.','Research preferences',()=>onGo('Settings')],
        ['03','Follow what changes','Read your AI brief and check the evidence.','Open AI research',()=>onGo('Research')],
      ].map(([n,h,p,label,action])=><button key={n} onClick={action} aria-label={label}><span>{n}</span><div><strong>{h}</strong><p>{p}</p></div><DeskIcon type="Arrow" size={18}/></button>)}</section>:<section className={d.allocationCard}>
        <div className={d.cardHeading}><h2>Where your money sits</h2><span>Priced holdings only</span></div>
        {portfolio.allocation.length?<><div className={d.allocationBar} role="img" aria-label={portfolio.allocation.map(a=>`${a.market}: ${percent(a.weight)}`).join(', ')}>{portfolio.allocation.map(a=><span key={a.market} style={{width:percent(a.weight),background:COLORS[a.market]}}/>)}</div><div className={d.allocations}>{portfolio.allocation.map(a=><div key={a.market}><span><i style={{background:COLORS[a.market]}}/>{a.market}</span><b>{percent(a.weight)}</b><small>{money(a.value,currency)}</small></div>)}</div></>:<p className={d.help}>Your holdings are saved. Confirm their listings and connect sourced prices to see allocation.</p>}
        <div className={d.cardHeading}><h3>Your largest positions</h3><button onClick={()=>onGo('Portfolio')}>View all <DeskIcon type="Arrow" size={15}/></button></div>
        {[...portfolio.rows].sort((a,b)=>(b.value??-1)-(a.value??-1)).slice(0,4).map(p=><button className={d.positionRow} key={p.id} onClick={()=>onSelect(p)}><span className={d.assetAvatar}>{p.symbol.slice(0,2)}</span><span><strong>{p.symbol}</strong><small>{p.name}</small></span><span><strong>{money(p.value,currency)}</strong><small>{p.weight==null?'Price unavailable':`${percent(p.weight)} of priced value`}</small></span></button>)}
      </section>}
    </div>
    <aside className={d.overviewRail}>
      <section className={d.researchFeature}><div className={d.cardEyebrow}><DeskIcon type="Research" size={19}/> STOCKEDBY INTELLIGENCE</div><h2>A second perspective.<br/>Before your next move.</h2><p>Explore the catalyst, challenge the thesis and check what could change your view.</p><div className={d.researchPills}><span>The thesis</span><span>The countercase</span><span>The evidence</span></div><button onClick={()=>onGo('Research')}>{latest?'Read your latest brief':'Open AI research'} <DeskIcon type="Arrow" size={17}/></button>{latest&&<small>Last brief · {new Date(latest.started_at).toLocaleDateString('en-GB',{timeZone:'Asia/Dubai',day:'numeric',month:'short'})}</small>}</section>
      <section className={d.radar}><div className={d.cardHeading}><h2>On your radar</h2><button onClick={()=>onGo('Activity')} aria-label="View all alerts"><DeskIcon type="Arrow" size={17}/></button></div>{state.alerts.length?state.alerts.slice(0,3).map(a=><article key={a.id}><small>{a.data.security||'Market update'}</small><h3>{a.data.title}</h3><p>{a.data.impact}</p><button onClick={()=>onGo('Activity')}>Read update ↗</button></article>):<div className={d.quietRadar}><DeskIcon type="Activity" size={25}/><h3>You’re all caught up.</h3><p>No alerts have been recorded yet. Your next scan may surface a change.</p></div>}</section>
      <button className={d.scheduleCard} onClick={()=>onGo('Settings')}><span className={state.scheduled?d.statusDot:d.pausedDot}/><div><strong>{state.scheduled?'Daily tracking is on':'Set your tracking rhythm'}</strong><small>{state.scheduled?'10:00 & 19:00 hours · Dubai':'Choose two daily in-app scans'}</small></div><DeskIcon type="Arrow" size={16}/></button>
    </aside>
  </div>;
}

'use client';
import { useState } from 'react';
import { trackingView } from '@/lib/terminal/holdingNews';
import s from './portfolioNews.module.css';

const date = value => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Dubai', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }) + ' GST' : 'Not checked yet';
export default function PortfolioNews({ state, onCheck, onSettings, onAll, compact = false, security = '', onSecurity, scopeMarket = 'All' }) {
  const [market, setMarket] = useState('All');
  const view = trackingView(state);
  if (!view.total) return null;
  const visible = view.items.map(item => ({ ...item, holdingImpacts: item.holdingImpacts.filter(impact => (!security || impact.security === security) && (market === 'All' || impact.holding.market === market)) })).filter(item => item.holdingImpacts.length);
  const selected = view.holdings.filter(p => (!security || p.key === security) && (market === 'All' || p.market === market));
  const error = view.feed?.analysisError || (view.job?.status === 'deferred' || view.job?.status === 'failed' ? view.job.errors?.join(' ') : null);
  return <section className={s.panel} aria-label="News affecting your holdings">
    <div className={s.heading}><div><span className={s.eyebrow}>YOUR HOLDINGS · CONNECTED TO THE NEWS</span><h2>What matters to your portfolio.</h2><p>{view.running ? 'Checking holding news and preparing explanations…' : `${view.fresh} of ${view.total} holdings checked in the last 24 hours`}</p></div><button onClick={onCheck} disabled={view.running}>{view.running ? 'Checking…' : 'Check now'} <span aria-hidden="true">↗</span></button></div>
    <div className={s.status}><span><i className={state.scheduled ? s.on : s.off}/>{state.scheduled ? 'Automatic checks on' : 'Automatic checks paused'}</span><span>India · 10:00–10:59 GST / US · 19:00–19:59 GST</span><button onClick={onSettings}>Manage</button></div>
    <p className={s.note}>News is checked on this schedule, including while you’re away. Live prices and fund NAVs need a connected data feed. Your imported quantities stay as entered until you update them.</p>
    {view.running && <p className={s.progress} role="status">You can leave this page. Results are saved online and appear here when ready.</p>}
    {error && !view.running && <p className={s.warning}>The latest check has a gap: {error} Previous results keep their original dates.</p>}
    {!compact && <div className={s.filters}>{scopeMarket === 'All' && <label>Market<select aria-label="Market" value={market} onChange={e => setMarket(e.target.value)}><option>All</option><option>India</option><option>US</option></select></label>}<label>Holding<select aria-label="Holding" value={security} onChange={e => onSecurity?.(e.target.value)}><option value="">All my holdings</option>{view.holdings.map(p => <option key={p.key} value={p.key}>{p.symbol} · {p.name}</option>)}</select></label></div>}
    <div className={s.stories}>{visible.slice(0, compact ? 3 : 80).map(item => <article className={s.story} key={item.url}>
      <div className={s.meta}><span>{new URL(item.url).hostname.replace(/^www\./, '')}</span><time dateTime={item.publishedAt}>{date(item.publishedAt)}</time></div>
      <h3><a href={item.url} target="_blank" rel="noreferrer">{item.title} ↗</a></h3>
      {item.reportedFact && <p className={s.fact}><b>Reported</b>{item.reportedFact}</p>}
      {item.holdingImpacts.map(impact => <div className={s.impact} key={impact.security}>
        <div className={s.impactHeading}><strong>{impact.holding.symbol}</strong><span className={s[impact.direction]}>Potentially {impact.direction}</span><span>{impact.relationship === 'direct' ? 'Direct connection' : 'Indirect exposure'}</span></div>
        {impact.holding.mapping !== 'confirmed' && <p className={s.warning}>Listing not confirmed. Check that the source refers to your company or fund; prices remain unavailable.</p>}
        <p><b>Why it matters to you</b>{impact.reason}</p><p><b>How it could affect your holding</b>{impact.mechanism}</p>
        {impact.watchFor && <p><b>Watch next</b>{impact.watchFor}</p>}{impact.uncertainty && <p className={s.note}><b>What’s uncertain</b>{impact.uncertainty}</p>}
      </div>)}
      <p className={s.note}>AI interpretation · source-linked, not a guaranteed price move. <a href={item.url} target="_blank" rel="noreferrer">Read the source ↗</a></p>
    </article>)}</div>
    {!visible.length && <div className={s.empty}><h3>{view.running ? 'Your first connections are on their way.' : view.feed ? 'No supported impact explanation yet.' : 'Your holdings are ready to follow.'}</h3><p>{view.feed ? 'This does not mean there is no relevant news or risk. Check the headline coverage below or run another check.' : 'The first check finds company news and explains possible effects on the holdings you own.'}</p></div>}
    {!compact && <details className={s.coverage}><summary>Coverage for each holding ({selected.length})</summary>{selected.map(p => <article key={p.key}><div><strong>{p.symbol}</strong><span>{p.market} · {p.name}</span><small>{p.error || date(p.checkedAt)}</small></div>{p.headlines?.length ? <ul>{p.headlines.map(n => <li key={n.url}><a href={n.url} target="_blank" rel="noreferrer">{n.title} ↗</a><small>{n.publisher} · {date(n.publishedAt)} · headline lead, impact may not be assessed</small></li>)}</ul> : <p>{p.checkedAt ? 'No matching recent headlines returned by the selected sources.' : 'Queued for a news check.'}</p>}</article>)}{view.feed?.deferred > 0 && <p>{view.feed.deferred} holdings were deferred in the last check. Later checks start with the least recently checked holdings.</p>}{view.feed?.gaps?.length > 0 && <ul>{view.feed.gaps.map((gap,n) => <li key={n}>{gap}</li>)}</ul>}</details>}
    <footer><span>Last news check · {date(view.feed?.lastCheckedAt)}</span>{compact && <button onClick={onAll}>All holding news →</button>}</footer>
  </section>;
}

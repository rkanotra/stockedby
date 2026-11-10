'use client';
import { useId, useState } from 'react';
import { historicalRisk, scenarioMath } from '@/lib/terminal/researchLab';
import s from './decisionLab.module.css';

const pct = value => value == null ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
const day = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const topics = { assumption: 'What must be true', alternative: 'The strongest alternative', falsifier: 'What would change the call' };
function EvidenceLinks({ claim, report }) {
  const sources = [...(claim.evidenceIds || []).map(id => report.evidence?.sources?.find(source => source.id === id)), ...(claim.sourceURLs || []).map(url => report.sources?.find(source => source.url === url))].filter(Boolean);
  return <div className={s.sources}>{[...new Map(sources.map(source => [source.url || source.id, source])).values()].map((source, i) => source.url ? <a key={i} href={source.url} target="_blank" rel="noreferrer">{source.title?.startsWith('http') ? new URL(source.url).hostname : source.title || 'Source'} ↗</a> : <span key={i}>{source.title}</span>)}</div>;
}

export function ResearchChallenge({ report, response, onSave, onReview, busy, readOnly = false }) {
  const [answer, setAnswer] = useState(response?.answer || ''), id = useId();
  const challenge = report?.challenge;
  return <section className={`${s.lab} ${s.challenge}`} aria-labelledby={id}>
    <div className={s.kicker}>CHALLENGE THE CASE</div>
    <h3 id={id}>A better question. A stronger decision.</h3>
    {!challenge ? <>{readOnly ? <p>This older review predates research challenges. Open the latest review to continue your research.</p> : <><p>Create a new AI review to expose the key assumption, test an alternative explanation and identify what would change the conclusion.</p><button disabled={busy} onClick={onReview}>Create a research challenge →</button></>}</> : <>
      <p className={s.caption}>AI interpretation · {day(report.createdAt)} · {report.decision?.stance || 'Unrated'} / {report.decision?.confidence || 'Unrated'} confidence</p>
      <div className={s.challengeGrid}>{Object.entries(topics).map(([key, label], i) => <article key={key}><span className={s.step}>0{i + 1}</span><h4>{label}</h4><p>{challenge[key].text}</p>{key==='falsifier'&&<p className={s.caption}>Proposed research triggers · not automatic trade rules</p>}<EvidenceLinks claim={challenge[key]} report={report}/></article>)}</div>
      <div className={s.question}>
        <span className={s.kicker}>THE NEXT QUESTION</span><h4>{challenge.question}</h4>
        {readOnly ? <p>{response?.answer || 'No answer recorded for this question.'}</p> : <>
          <label htmlFor={`${id}-answer`}>Your evidence or reasoning <span>Optional</span></label>
          <textarea id={`${id}-answer`} rows={3} maxLength={2000} value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Add a source, a finding, or what you still need to verify." disabled={busy}/>
          <div className={s.actions}><button disabled={busy || !answer.trim() || answer.trim() === response?.answer} onClick={() => onSave(report.id, answer)}>Save answer</button>{response && <button disabled={busy || answer.trim() !== response.answer} onClick={onReview}>Reassess with my answer →</button>}<span role="status">{response ? `Saved online · ${day(response.savedAt)}` : 'Save without using AI credit'}</span></div>
          <p className={s.caption}>Your answer is a hypothesis to verify. Reassessing sends it with the research context to OpenAI and uses one review. Keep account numbers and balances out.</p>
        </>}
      </div>
    </>}
  </section>;
}

function Scenario() {
  const [inputs, setInputs] = useState({ gain: '15', loss: '15', probability: '50', costs: '0.5' });
  const result = scenarioMath(inputs), id = useId();
  const labels = { gain: 'Gain if right (%)', loss: 'Loss if wrong (%)', probability: 'Assumed chance of gain (%)', costs: 'Round-trip costs (%)' };
  return <section className={`${s.lab} ${s.scenario}`} aria-labelledby={id}>
    <span className={s.kicker}>TEST YOUR ASSUMPTIONS</span><h3 id={id}>Does the payoff justify the risk?</h3>
    <p>A two-outcome thought experiment. These starting values are illustrative, not estimates for this stock. Use the same holding period for both outcomes.</p>
    <div className={s.inputs}>{Object.entries(labels).map(([key, label]) => <label key={key} htmlFor={`${id}-${key}`}>{label}<input id={`${id}-${key}`} type="number" inputMode="decimal" min="0" max={key === 'gain' ? 1000 : 100} step="any" value={inputs[key]} onChange={event => setInputs({ ...inputs, [key]: event.target.value })}/></label>)}</div>
    <div className={s.result} aria-live="polite" aria-atomic="true">{result ? <><div><span>Expected return under your assumptions</span><strong data-tone={result.expected >= 0 ? 'up' : 'down'}>{pct(result.expected)}</strong></div><div><span>Chance of gain needed to break even</span><strong>{result.attainable ? `${result.breakEven.toFixed(1)}%` : 'Not attainable'}</strong></div><p>{result.attainable ? `Your assumed chance is ${inputs.probability}%. This is not a measured probability or a return forecast.` : 'Even the gain scenario does not cover the costs you entered.'}</p></> : <p>Enter valid percentages in all four fields. Loss, probability and costs must be 0–100%; gain 0–1,000%. Gain and loss cannot both be zero.</p>}</div>
    <details><summary>How this is calculated</summary><p>Expected return = chance × gain − (1 − chance) × loss − costs. Break-even chance = (loss + costs) ÷ (gain + loss). Costs are a percentage of initial capital, charged in either outcome. This simplified model excludes taxes, currency moves and other outcomes. Scenarios stay in this tab; they are not saved or sent to AI.</p></details>
  </section>;
}

function RiskHistory({ evidence }) {
  const risk = historicalRisk(evidence?.technical?.series, { asOf: evidence?.fetchedAt });
  const source = evidence?.sources?.find(source => source.id === 'technical');
  const id = useId();
  const worst = risk.available ? Math.max(1, Math.abs(risk.maxDrawdown)) : 1;
  const path = risk.drawdowns?.map((p, i) => `${i ? 'L' : 'M'}${(i / (risk.count - 1) * 940 + 10).toFixed(1)},${(12 + Math.abs(p.value) / worst * 120).toFixed(1)}`).join(' ');
  return <section className={`${s.lab} ${s.history}`} aria-labelledby={id}>
    <div className={s.historyHead}><div><span className={s.kicker}>MEASURE THE DOWNSIDE</span><h3 id={id}>What holding this has felt like.</h3></div>{source?.url && <a href={source.url} target="_blank" rel="noreferrer">Price history source ↗</a>}</div>
    {!risk.available ? <p>{risk.reason} No historical risk estimate is shown.</p> : <>
      <p className={s.caption}>{risk.count} observed closes · {day(risk.start)} – {day(risk.end)} · calculated from the saved evidence</p>
      {risk.stale && <p className={s.warning}>The last price is more than seven days older than this evidence snapshot. Refresh before treating this as current context.</p>}
      {risk.gaps > 0 && <p className={s.warning}>{risk.gaps} gaps exceed seven calendar days. Windows spanning those gaps are excluded; daily volatility may be unavailable.</p>}
      <div className={s.metrics}>
        <div><span>Largest peak-to-trough fall</span><strong data-tone="down">{pct(risk.maxDrawdown)}</strong><small>{day(risk.peakDate)} → {day(risk.troughDate)}</small></div>
        <div><span>Latest close below observed peak</span><strong data-tone="down">{pct(risk.currentDrawdown)}</strong><small>As of {day(risk.end)}</small></div>
        <div><span>60-session volatility</span><strong>{risk.volatility60 == null ? '—' : `${risk.volatility60.toFixed(1)}%`}</strong><small>{risk.volatility60 == null ? 'Needs 61 consecutive closes' : 'Annualized · not a loss limit'}</small></div>
        <div><span>Worst rolling 20-session return</span><strong data-tone={risk.worst20?.value >= 0 ? 'up' : 'down'}>{pct(risk.worst20?.value)}</strong><small>{risk.worst20 ? `${day(risk.worst20.start)} → ${day(risk.worst20.end)}` : 'Needs 21 consecutive closes'}</small></div>
      </div>
      <figure className={s.drawdown}><figcaption>Distance below the running peak <span>0% = at the observed high</span></figcaption><svg viewBox="0 0 960 156" role="img" aria-label={`Drawdown chart. Largest observed fall ${pct(risk.maxDrawdown)}; latest ${pct(risk.currentDrawdown)}.`}><line x1="10" x2="950" y1="12" y2="12" stroke="currentColor" opacity=".2"/><path d={`${path} L950,12 L10,12 Z`} fill="currentColor" opacity=".09"/><path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/></svg><div className={s.axis}><span>{day(risk.start)}</span><span>{day(risk.end)}</span></div></figure>
      <div className={s.outcomes}><div><h4>20-session outcomes</h4><p>{risk.outcomes.count ? `${risk.outcomes.count} non-overlapping periods. ${risk.outcomes.positive} positive, ${risk.outcomes.negative} negative. Median ${pct(risk.outcomes.median)}.` : 'Not enough consecutive observations for a completed 20-session period.'}</p><p className={s.caption}>A small historical sample, not the chance your next investment will win.</p></div><div className={s.windowBars}>{risk.windows.map(w => <div key={w.start}><span>{day(w.end)}</span><b data-tone={w.value >= 0 ? 'up' : 'down'}>{pct(w.value)}</b></div>)}</div></div>
      <details><summary>Method & limitations</summary><p>Provider-adjusted close series as supplied; adjusted returns may differ from broker price returns. Drawdowns use the highest earlier close in this window. Volatility uses the sample standard deviation of the latest 60 log returns × √252. Rolling 20-session returns overlap; the outcome sample instead advances 20 observations at a time from the first available close. Adjacent periods can still be correlated. Costs, taxes and currency effects are excluded. Provider revisions may change these values.</p><p>These are descriptive measurements, not a backtest. Current financial statements and today’s stock list cannot reconstruct what was knowable in the past. A strategy needs archived point-in-time data, untouched out-of-sample evaluation and realistic costs before any edge claim. Future losses can exceed the falls shown here.</p>{risk.excludedFuture > 0 && <p>{risk.excludedFuture} observations on or after the snapshot date were excluded.</p>}</details>
    </>}
  </section>;
}

export default function DecisionLab({ evidence, report, response, onSave, onReview, busy }) {
  return <div className={s.stack}><ResearchChallenge key={report?.id || 'empty'} report={report} response={response} onSave={onSave} onReview={onReview} busy={busy}/><RiskHistory evidence={evidence}/><Scenario/></div>;
}

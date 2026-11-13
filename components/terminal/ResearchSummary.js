import { instrumentId } from '@/lib/terminal/domain';
import { holdingDecision } from '@/lib/terminal/reviewShelf';
import c from './researchSummary.module.css';

export default function ResearchSummary({holding, cache, onOpen, automatic = false, expanded = false}) {
  const decision = holdingDecision(cache, instrumentId(holding));
  const key=instrumentId(holding);
  const pending=cache?.['dossier:'+key]?.reviewState==='researching'?'Review in progress':cache?.['auto-attempt:'+key]?.retryAt?'Waiting to retry':'Queued for review';
  const status=decision?.stance || (automatic ? pending : 'Not reviewed');
  const date = decision?.date && Number.isFinite(Date.parse(decision.date))
    ? new Date(decision.date).toLocaleDateString('en-GB', {day:'numeric', month:'short',year:'numeric'}) : '';
  return <div className={c.summary} data-expanded={expanded}>
    <button type="button" className={c.link} onClick={()=>onOpen(holding)}
      aria-label={`Open research for ${holding.symbol}: ${status}`}>
      <span className={c.badge} data-stance={decision?.stance}>{status}</span>
      <span aria-hidden="true">↗</span>
    </button>
    {decision ? <>
      <span className={c.reason}>{decision.reason}</span>
      <span className={c.meta}>{[date, decision.confidence && decision.confidence+' confidence', decision.changed && 'Newer evidence available'].filter(Boolean).join(' · ')}</span>
    </> : <span className={c.meta}>{automatic ? 'Your first rating appears here when the review finishes.' : 'No saved assessment yet.'}</span>}
  </div>;
}

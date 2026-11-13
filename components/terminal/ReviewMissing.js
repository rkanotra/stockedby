'use client';

import { useEffect, useRef, useState } from 'react';
import { instrumentId, isListingResolved } from '@/lib/terminal/domain';
import { holdingDecision } from '@/lib/terminal/reviewShelf';
import c from './portfolioResearch.module.css';

export function useMissingReviews({ holdings, cache, usage, api, onReload, indexOpen }) {
  const [progress, setProgress] = useState('');
  const [running, setRunning] = useState(false);
  const active = useRef(false);
  const stop = useRef(false);
  useEffect(() => () => { stop.current = true; }, [indexOpen]);
  const missing = holdings.filter(p => !holdingDecision(cache, instrumentId(p)));
  const ready = missing.filter(p => isListingResolved(p, cache[instrumentId(p)]));
  const remaining = usage ? Math.max(0, usage.researchLimit - usage.research) : Infinity;
  const batch = ready.slice(0, remaining);

  async function reviewMissing(selection = batch) {
    if (active.current || !selection.length || remaining <= 0) return;
    active.current = true;
    stop.current = false;
    setRunning(true);
    let completed = 0;
    const failed = [];
    try {
      for (const holding of selection) {
        if (stop.current) break;
        const security = instrumentId(holding);
        setProgress(`Reviewing ${holding.symbol} · ${completed + failed.length + 1} of ${selection.length}`);
        try {
          await api('/run', { kind: 'dossier', mode: 'review_missing', security });
        } catch (error) {
          if (error.status !== 502 || !/report section|source table|citation formatting|could not be validated/i.test(error.message)) throw error;
          failed.push(holding.symbol);
          await onReload();
          continue;
        }
        const saved = await onReload();
        if (!holdingDecision(saved.cache, security)) throw Error(`No saved decision yet for ${holding.symbol}. Check Activity before resuming.`);
        completed++;
      }
      const outcome = failed.length ? ` Source checks failed for ${failed.join(', ')}.` : '';
      setProgress(`${completed} of ${selection.length} reviews saved.${outcome}`);
    } catch (error) {
      await onReload().catch(() => {});
      setProgress(`Review batch paused. ${error.message || 'Check Activity and resume the missing reviews.'}`);
    } finally {
      active.current = false;
      setRunning(false);
    }
  }

  function pause() {
    stop.current = true;
    setProgress('Finishing the current review before pausing.');
  }
  return { batch, missing, ready, remaining, running, progress, reviewMissing, pause };
}

export default function ReviewMissing({ queue }) {
  const { batch, missing, ready, remaining, running, progress, reviewMissing, pause } = queue;
  if (!missing.length && !progress) return null;
  return <div className={c.reviewQueue}>
    {missing.length > 0 && <p>Prices and news update separately. A research view appears once a detailed review is saved.
      {ready.length < missing.length && ' Confirm unmatched listings in Portfolio before reviewing them.'}</p>}
    {running ? <button onClick={pause}>Pause after this stock</button>
      : missing.length > 0 && <button className={c.primary} disabled={!batch.length} onClick={() => reviewMissing()}>Review missing holdings ({batch.length || missing.length})</button>}
    {!!batch.length && !running && <small>Up to {batch.length} research runs. Keep this page open during the batch.</small>}
    {!remaining && missing.length > 0 && <small>Your daily allowance is used. It resets at 00:00 UTC.</small>}
    {progress && <span role="status">{progress}</span>}
  </div>;
}

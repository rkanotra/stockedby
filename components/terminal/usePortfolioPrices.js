'use client';
import { useEffect, useState } from 'react';
import { priceIdentity, priceKey, PRICE_REFRESH_MS } from '@/lib/terminal/prices';
import { refreshPortfolioPrices, mergePriceRefresh } from '@/lib/terminal/priceRefresh';

export default function usePortfolioPrices(positions, persist = false) {
  const [prices, setPrices] = useState({}), [loading, setLoading] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [completed, setCompleted] = useState(0);
  const identities = JSON.stringify([...new Map((positions || []).filter(p => !p.archived && p.selected !== false).map(priceIdentity).filter(Boolean).map(p => [priceKey(p), p])).values()]);
  useEffect(() => {
    const controller = new AbortController(), instruments = JSON.parse(identities);
    const timer = setTimeout(async () => {
      setLoading(!!instruments.length); setError(''); setCompleted(0);
      try {
        const failure = await refreshPortfolioPrices(instruments, { persist, signal: controller.signal, onPrices: incoming => setPrices(current => mergePriceRefresh(current, incoming)), onProgress: setCompleted });
        if (!controller.signal.aborted) setError(failure);
      } catch (e) { if (!controller.signal.aborted) setError(e.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [identities, persist, revision]);
  useEffect(() => {
    if (!persist) return;
    const refresh = () => { if (document.visibilityState === 'visible') setRevision(n => n + 1); };
    const timer = setInterval(refresh, PRICE_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [persist]);
  return { prices, loading, error, completed, total: JSON.parse(identities).length, refresh: () => setRevision(n => n + 1) };
}

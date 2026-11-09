'use client';
import { useEffect, useState } from 'react';
import { priceIdentity, priceKey, PRICE_REFRESH_MS } from '@/lib/terminal/prices';

export default function usePortfolioPrices(positions, persist = false) {
  const [prices, setPrices] = useState({}), [loading, setLoading] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const identities = JSON.stringify([...new Map((positions || []).filter(p => !p.archived && p.selected !== false).map(priceIdentity).filter(Boolean).map(p => [priceKey(p), p])).values()]);
  useEffect(() => {
    const controller = new AbortController(), instruments = JSON.parse(identities);
    const timer = setTimeout(async () => {
      setLoading(!!instruments.length); setError(''); setPrices({});
      try {
        for (let index = 0; index < instruments.length; index += 25) {
          const response = await fetch('/api/terminal/market', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'quotes', instruments: instruments.slice(index, index + 25), persist }), cache: 'no-store', signal: controller.signal });
          const data = await response.json();
          if (!response.ok) throw Error(data.error || 'Prices could not refresh. Please retry.');
          if (!controller.signal.aborted) setPrices(current => ({ ...current, ...data.prices }));
        }
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
  return { prices, loading, error, refresh: () => setRevision(n => n + 1) };
}

import { mergeListingVerification } from './domain.js';

// Small batches render progressively; one failed batch must not hide every holding.
export async function refreshPortfolioPrices(instruments, { persist = false, signal, onPrices, onProgress = () => {}, fetcher = fetch, timeoutMs = 55000 } = {}) {
  const errors = [];
  for (let index = 0; index < instruments.length; index += 5) {
    if (signal?.aborted) break;
    const batch = instruments.slice(index, index + 5);
    try {
      const response = await fetcher('/api/terminal/market', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ mode: 'quotes', instruments: batch, persist }),
        signal: AbortSignal.any([...(signal ? [signal] : []), AbortSignal.timeout(timeoutMs)]),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw Object.assign(Error(data.error || 'Prices could not refresh. Please retry.'), { status: response.status });
      }
      const data = await response.json();
      if (!signal?.aborted) onPrices(data.prices || {});
    } catch (e) {
      if (signal?.aborted) break;
      errors.push(e.name === 'TimeoutError' ? 'A price request timed out. Last available prices are retained; retry to update.' : e.message);
      if ([401, 403].includes(e.status)) break;
    }
    if (!signal?.aborted) onProgress(Math.min(index + batch.length, instruments.length));
  }
  return [...new Set(errors)].join(' ');
}

export function mergePriceRefresh(previous, incoming) {
  const merged = { ...previous };
  for (const [key, value] of Object.entries(incoming)) {
    const old = previous[key];
    // Preserve successful observations, with their original timestamp, on failure
    // or an older server response. Freshness is still checked when valuing holdings.
    merged[key] = old?.quote && (!value?.quote || Date.parse(old.quote.asOf) > Date.parse(value.quote.asOf))
      ? { ...mergeListingVerification(old, value), lastError: value?.unavailable || value?.lastError || old.lastError }
      : value;
  }
  return merged;
}

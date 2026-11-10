// Descriptive risk, not a trading backtest. Never mix today's statements with
// historical prices to manufacture a point-in-time strategy result.
const DAY = 86400000;
const median = values => {
  const sorted = [...values].sort((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length ? sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 : null;
};
const validDay = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;

export function historicalRisk(series, { asOf } = {}) {
  const cutoff = Date.parse(asOf);
  const unavailable = reason => ({ available: false, reason });
  if (!Number.isFinite(cutoff)) return unavailable('A dated evidence snapshot is required.');
  if (!Array.isArray(series) || series.length > 2000) return unavailable('Usable price history is unavailable.');
  const dates = new Map();
  let excludedFuture = 0;
  for (const point of series) {
    if (!validDay(point?.date) || typeof point.close !== 'number' || !Number.isFinite(point.close) || point.close <= 0) return unavailable('Price history contains invalid dates or prices. Refresh evidence.');
    // Date-only bars have no intraday completion timestamp. Exclude the cutoff day.
    if (point.date >= new Date(cutoff).toISOString().slice(0, 10)) { excludedFuture++; continue; }
    if (dates.has(point.date) && dates.get(point.date) !== point.close) return unavailable('Conflicting closes were returned for the same date.');
    dates.set(point.date, point.close);
  }
  const points = [...dates].sort(([a], [b]) => a.localeCompare(b)).map(([date, close]) => ({ date, close }));
  if (points.length < 2) return unavailable('At least two completed price observations are needed.');
  let peak = points[0], maxDrawdown = 0, peakDate = peak.date, troughDate = peak.date;
  const drawdowns = points.map(point => {
    if (point.close > peak.close) peak = point;
    const drawdown = (point.close / peak.close - 1) * 100;
    if (drawdown < maxDrawdown) { maxDrawdown = drawdown; peakDate = peak.date; troughDate = point.date; }
    return { date: point.date, value: drawdown };
  });
  const longGap = (a, b) => Date.parse(b.date) - Date.parse(a.date) > 7 * DAY;
  const continuous = range => range.every((p, i) => !i || !longGap(range[i - 1], p));
  const gaps = points.slice(1).filter((p, i) => longGap(points[i], p)).length;
  const recent = points.slice(-61);
  let volatility60 = null;
  if (recent.length === 61 && continuous(recent)) {
    const returns = recent.slice(1).map((p, i) => Math.log(p.close / recent[i].close));
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    volatility60 = Math.sqrt(returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1)) * Math.sqrt(252) * 100;
  }
  const windows = [], rolling = [];
  for (let i = 0; i + 20 < points.length; i++) {
    const range = points.slice(i, i + 21);
    if (!continuous(range)) continue;
    const window = { start: range[0].date, end: range[20].date, value: (range[20].close / range[0].close - 1) * 100 };
    rolling.push(window);
    if (i % 20 === 0) windows.push(window);
  }
  const last = points.at(-1), worst = rolling.reduce((a, b) => !a || b.value < a.value ? b : a, null);
  return {
    available: true, count: points.length, start: points[0].date, end: last.date, excludedFuture, gaps,
    stale: cutoff - Date.parse(last.date) > 7 * DAY,
    maxDrawdown, peakDate, troughDate, currentDrawdown: drawdowns.at(-1).value, volatility60,
    worst20: worst, drawdowns, windows,
    outcomes: { count: windows.length, positive: windows.filter(w => w.value > 0).length, negative: windows.filter(w => w.value < 0).length, median: median(windows.map(w => w.value)) },
  };
}

export function scenarioMath({ gain, loss, probability, costs }) {
  const values = [gain, loss, probability, costs];
  if (values.some(v => v === '' || v == null || typeof v === 'boolean' || !['number', 'string'].includes(typeof v) || (typeof v === 'string' && !v.trim()) || !Number.isFinite(Number(v)))) return null;
  const [g, l, p, c] = values.map(Number);
  if (g < 0 || g > 1000 || l < 0 || l > 100 || p < 0 || p > 100 || c < 0 || c > 100 || g + l === 0) return null;
  return { expected: p / 100 * g - (1 - p / 100) * l - c, breakEven: (l + c) / (g + l) * 100, attainable: c <= g };
}

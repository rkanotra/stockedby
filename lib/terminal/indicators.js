export function validateBars(rows, adjustment = 'unknown') {
  if (!Array.isArray(rows) || rows.length > 2000) throw Error('Invalid history.');
  const seen = new Set();
  const bars = rows.map(r => {
    const date = String(r.date || '').slice(0, 10);
    const b = { date, open: Number(r.open), high: Number(r.high), low: Number(r.low), close: Number(r.close), volume: r.volume === null || r.volume === '' || r.volume === undefined ? null : Number(r.volume) };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || seen.has(date) || [b.open, b.high, b.low, b.close].some(v => !Number.isFinite(v) || v <= 0) || b.high < Math.max(b.open, b.close, b.low) || b.low > Math.min(b.open, b.close) || (b.volume !== null && (!Number.isFinite(b.volume) || b.volume < 0))) throw Error('History needs unique dates, valid OHLC prices and non-negative volume.');
    seen.add(date); return b;
  }).sort((a, b) => a.date.localeCompare(b.date));
  if (!['split-adjusted', 'not-applicable', 'unknown'].includes(adjustment)) throw Error('Choose the history adjustment basis.');
  return { bars, adjustment, returnType: 'price return; excludes dividends and cash flows' };
}
export function indicators(history) {
  const bars = history?.bars || [], known = ['split-adjusted', 'not-applicable'].includes(history?.adjustment);
  const result = { count: bars.length, start: bars[0]?.date || null, end: bars.at(-1)?.date || null, sma20: null, sma50: null, sma200: null, rsi14: null, relativeVolume: null, reason: known ? 'Insufficient observations for unavailable indicators.' : 'Adjustment basis unverified. Indicators withheld.' };
  if (!known) return result;
  for (const n of [20, 50, 200]) if (bars.length >= n) result[`sma${n}`] = bars.slice(-n).reduce((s, b) => s + b.close, 0) / n;
  if (bars.length >= 15) {
    let gain = 0, loss = 0;
    for (let i = 1; i < 15; i++) { const d = bars[i].close - bars[i - 1].close; gain += Math.max(d, 0) / 14; loss += Math.max(-d, 0) / 14; }
    for (let i = 15; i < bars.length; i++) { const d = bars[i].close - bars[i - 1].close; gain = (gain * 13 + Math.max(d, 0)) / 14; loss = (loss * 13 + Math.max(-d, 0)) / 14; }
    result.rsi14 = loss === 0 ? gain === 0 ? 50 : 100 : 100 - 100 / (1 + gain / loss);
  }
  if (bars.length >= 21 && bars.slice(-21).every(b => b.volume !== null)) {
    const avg = bars.slice(-21, -1).reduce((s, b) => s + b.volume, 0) / 20;
    if (avg > 0) result.relativeVolume = bars.at(-1).volume / avg;
  }
  return result;
}
export function compareHistory(a, b, sessions = 90) {
  if (!['split-adjusted', 'not-applicable'].includes(a?.adjustment) || !['split-adjusted', 'not-applicable'].includes(b?.adjustment)) return [];
  const bm = new Map(b.bars.map(r => [r.date, r.close]));
  const common = a.bars.filter(r => bm.has(r.date)).slice(-sessions);
  if (common.length < 2) return [];
  const first = common[0];
  return common.map(r => ({ date: r.date, security: (r.close / first.close - 1) * 100, benchmark: (bm.get(r.date) / bm.get(first.date) - 1) * 100 }));
}

export function technicalObservations(history) {
  if (!history?.bars?.length) return [];
  const current = indicators(history), previous = indicators({ ...history, bars: history.bars.slice(0,-1) });
  const observations = [];
  if(current.sma20!==null && current.sma50!==null && previous.sma20!==null && previous.sma50!==null) {
    if(current.sma20>current.sma50 && previous.sma20<=previous.sma50) observations.push({code:'sma20-above-50',title:'20-day average crossed above the 50-day average'});
    if(current.sma20<current.sma50 && previous.sma20>=previous.sma50) observations.push({code:'sma20-below-50',title:'20-day average crossed below the 50-day average'});
  }
  if(current.rsi14!==null && previous.rsi14!==null) {
    if(current.rsi14>=70 && previous.rsi14<70) observations.push({code:'rsi-above-70',title:'RSI crossed above 70'});
    if(current.rsi14<=30 && previous.rsi14>30) observations.push({code:'rsi-below-30',title:'RSI crossed below 30'});
  }
  if(current.relativeVolume>=2) observations.push({code:'volume-2x',title:'Daily volume reached twice its prior 20-observation average'});
  return observations.map(o=>({...o,date:history.bars.at(-1).date}));
}

export const EXCHANGES = ['UNRESOLVED', 'NSE', 'BSE', 'INMF', 'USMF', 'DFM', 'ADX', 'NASDAQ', 'NYSE', 'NYSEARCA', 'CRYPTO', 'BROKER'];
export const ASSET_LABELS = { equity: 'Stock', etf: 'ETF', mutual_fund: 'Mutual fund', metal: 'Metal', crypto: 'Crypto' };
export const exchangeLabel = x => ({ INMF: 'India mutual fund', USMF: 'US mutual fund', UNRESOLVED: 'Not confirmed yet' })[x] || x;
export const CURRENCIES = ['AED', 'INR', 'USD'];
export const MARKETS = ['India', 'US'];
export const COLORS = { India: '#a998ff', UAE: '#237e70', US: '#73b6ff', Metals: '#927119', Crypto: '#8059ac' };
export const WATCH = [
  { symbol: 'VOO', exchange: 'NYSEARCA', currency: 'USD', assetClass: 'etf', name: 'Vanguard S&P 500 ETF', mapping: 'confirmed' },
  { symbol: 'RELIANCE', exchange: 'NSE', currency: 'INR', assetClass: 'equity', name: 'Reliance Industries', mapping: 'confirmed' },
];
export const instrumentId = p => `${p.exchange}:${p.symbol}`;
export function marketOf(p) {
  if (p.assetClass === 'metal') return 'Metals';
  if (p.assetClass === 'crypto') return 'Crypto';
  if (['NSE', 'BSE', 'INMF'].includes(p.exchange)) return 'India';
  if (['DFM', 'ADX'].includes(p.exchange)) return 'UAE';
  if (['NASDAQ', 'NYSE', 'NYSEARCA', 'USMF'].includes(p.exchange)) return 'US';
  return p.currency === 'INR' ? 'India' : p.currency === 'AED' ? 'UAE' : p.currency === 'USD' ? 'US' : 'Unresolved';
}
export function decimal(value, { signed = false, required = false } = {}) {
  const s = String(value ?? '').trim();
  if (!s) { if (required) throw Error('Quantity is required.'); return null; }
  if (!(signed ? /^-?\d{1,15}(\.\d{1,18})?$/ : /^\d{1,15}(\.\d{1,18})?$/).test(s)) throw Error('Use a plain decimal number with up to 18 decimal places.');
  return s;
}
const clean = (s, n = 120) => String(s ?? '').trim().slice(0, n);
export function normalizePosition(raw) {
  const p = {
    id: /^[a-zA-Z0-9_-]{8,80}$/.test(raw.id || '') ? raw.id : crypto.randomUUID(),
    name: clean(raw.name), symbol: clean(raw.symbol, 40).toUpperCase(), exchange: clean(raw.exchange || 'UNRESOLVED').toUpperCase(),
    currency: clean(raw.currency || 'USD').toUpperCase(), assetClass: clean(raw.assetClass || 'equity'),
    quantity: decimal(raw.quantity, { required: true }), costBasis: decimal(raw.costBasis),
    realizedPnl: decimal(raw.realizedPnl, { signed: true }), brokerPnl: decimal(raw.brokerPnl, { signed: true }),
    snapshotValue: decimal(raw.snapshotValue), snapshotAt: clean(raw.snapshotAt, 40),
    account: clean(raw.account || 'Default'), lot: clean(raw.lot), unit: clean(raw.unit || (raw.assetClass === 'mutual_fund' ? 'units' : 'shares'), 40),
    source: clean(raw.source || 'Manual entry', 200), isin: clean(raw.isin, 20), providerId: clean(raw.providerId, 80),
    mapping: raw.mapping === 'confirmed' ? 'confirmed' : 'unresolved', archived: raw.archived === true,
  };
  // Fund registries are namespaces, not stock exchanges or verified listings.
  if (p.assetClass === 'mutual_fund' && p.exchange === 'UNRESOLVED' && ['INR', 'USD'].includes(p.currency)) {
    p.exchange = p.currency === 'INR' ? 'INMF' : 'USMF'; p.mapping = 'unresolved';
  }
  if (!p.name || !/^[A-Z0-9.^&=_/-]{1,40}$/.test(p.symbol)) throw Error('Add a name and a valid ticker, scheme code or ISIN.');
  if (!EXCHANGES.includes(p.exchange) || !CURRENCIES.includes(p.currency)) throw Error('Choose a supported exchange and currency.');
  if (!['equity', 'etf', 'mutual_fund', 'metal', 'crypto'].includes(p.assetClass)) throw Error('Choose an asset type.');
  if (p.assetClass === 'mutual_fund' && !['INMF', 'USMF'].includes(p.exchange)) throw Error('Choose India mutual fund or US mutual fund as the listing type.');
  if (['INMF', 'USMF'].includes(p.exchange) && p.assetClass !== 'mutual_fund') throw Error('A fund registry requires the Mutual fund asset type.');
  const expected = ['NSE', 'BSE', 'INMF'].includes(p.exchange) ? 'INR' : ['DFM', 'ADX'].includes(p.exchange) ? 'AED' : ['NASDAQ', 'NYSE', 'NYSEARCA', 'USMF', 'CRYPTO'].includes(p.exchange) ? 'USD' : null;
  if (expected && expected !== p.currency) throw Error(`This listing must use ${expected}.`);
  if (p.exchange === 'UNRESOLVED') p.mapping = 'unresolved';
  if (p.mapping === 'confirmed') {
    if ((p.symbol === 'PARKIN' && p.exchange !== 'DFM') || (p.symbol === 'ADNHC' && p.exchange !== 'ADX')) throw Error('PARKIN belongs to DFM; ADNHC belongs to ADX.');
    if (p.symbol === 'VOO' && (p.exchange !== 'NYSEARCA' || p.assetClass !== 'etf')) throw Error('VOO is a US ETF listed on NYSEARCA.');
    if (p.assetClass === 'metal' && (!p.providerId || !raw.unit)) throw Error('Confirm the metal product identifier and broker unit first.');
  }
  return p;
}
export function normalizeState(raw) {
  if (!Array.isArray(raw.positions) || raw.positions.length > 500) throw Error('Use at most 500 positions.');
  const positions = raw.positions.map(normalizePosition);
  if (new Set(positions.map(p => p.id)).size !== positions.length) throw Error('Position IDs must be unique.');
  const watchlist = Array.isArray(raw.watchlist) ? raw.watchlist.slice(0,100).map(p => normalizePosition({ ...p, quantity: '0', account: 'Watchlist' })) : [];
  const screens = Array.isArray(raw.screens) ? raw.screens.slice(0,20).map(s => ({ name: clean(s.name,60), market: MARKETS.includes(s.market) ? s.market : 'All', maxPE: decimal(s.maxPE), minROE: decimal(s.minROE,{signed:true}), maxDebt: decimal(s.maxDebt), minGrowth: decimal(s.minGrowth,{signed:true}) })) : [];
  return { positions, watchlist, screens, settings: { currency: CURRENCIES.includes(raw.settings?.currency) ? raw.settings.currency : 'AED', horizon: clean(raw.settings?.horizon, 300), risk: clean(raw.settings?.risk, 300) } };
}
export function parseCSV(text) {
  if (text.length > 500000) throw Error('CSV is too large (maximum 500 KB).');
  const rows = []; let row = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i + 1] === '\n') i++; row.push(field); if (row.some(v => v.trim())) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (quoted) throw Error('A quoted CSV field is not closed.');
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2 || rows.length > 501) throw Error('Include a header and 1–500 data rows.');
  const headers = rows.shift().map(x => x.trim());
  if (new Set(headers).size !== headers.length) throw Error('CSV column names must be unique.');
  return rows.map((r, index) => {
    if (r.length !== headers.length) throw Error(`CSV row ${index + 2} has the wrong number of columns.`);
    return Object.fromEntries(headers.map((h, i) => [h, r[i]]));
  });
}
export function importPreview(text, existing = [], { market = 'All' } = {}) {
  if (!['All', ...MARKETS].includes(market)) throw Error('Choose a US or India portfolio, or automatic market split.');
  const identity = p => [p.currency, p.assetClass, p.account, p.lot, p.exchange, p.symbol].join('|').toUpperCase();
  const seen = new Map(existing.filter(p => !p.archived).map(p => [identity(p), p]));
  return parseCSV(text).map((raw, index) => {
    try {
      const p = normalizePosition({ ...raw, id: undefined, mapping: raw.mapping || 'unresolved' });
      if (market !== 'All' && marketOf(p) !== market) throw Error(`This holding belongs to ${marketOf(p)}, not the ${market} portfolio. Choose the correct destination.`);
      // A screenshot may omit the listing. Don't silently add a second copy of
      // a known holding just because one side has an unresolved exchange.
      const old = seen.get(identity(p)) || [...seen.values()].find(other =>
        (p.exchange === 'UNRESOLVED' || other.exchange === 'UNRESOLVED') &&
        p.currency === other.currency && p.assetClass === other.assetClass && p.symbol === other.symbol &&
        p.account.toUpperCase() === other.account.toUpperCase() &&
        p.lot.toUpperCase() === other.lot.toUpperCase());
      if (old) return { row: index + 2, position: p, status: old.quantity === p.quantity && old.costBasis === p.costBasis && old.snapshotValue === p.snapshotValue ? 'duplicate' : 'conflict', message: 'Same account, lot and security. Edit the existing position or use a distinct lot.' };
      seen.set(identity(p), p);
      return { row: index + 2, position: p, status: 'ready', message: p.mapping === 'unresolved' ? 'Import as unresolved; confirm the listing before pricing.' : 'Ready to import' };
    } catch (e) { return { row: index + 2, status: 'error', message: e.message }; }
  });
}
export const CSV_HEADER = 'name,symbol,exchange,currency,assetClass,quantity,costBasis,realizedPnl,brokerPnl,account,lot,unit,source,snapshotValue,snapshotAt,isin,providerId,mapping';
export function quoteState(data, now = Date.now()) {
  if (!data?.quote || !(data.quote.price > 0)) return 'missing';
  const age = now - Date.parse(data.quote.asOf);
  if (!Number.isFinite(age) || age < -300000) return 'missing';
  if (age > (data.quote.quality === 'live' ? 15 * 60000 : 96 * 3600000)) return 'stale';
  return data.quote.quality || 'delayed';
}
export function convert(value, from, to, fx, now = Date.now()) {
  if (value === null || !Number.isFinite(value)) return null;
  if (from === to) return value;
  if (!fx?.rates || !Number.isFinite(Date.parse(fx.asOf)) || now - Date.parse(fx.asOf) > 72 * 3600000 || Date.parse(fx.asOf) > now + 300000) return null;
  const a = fx.rates[from], b = fx.rates[to];
  return a > 0 && b > 0 ? value / a * b : null;
}
export function valuePortfolio(positions, marketData, fx, currency = 'AED', now = Date.now()) {
  const rows = positions.filter(p => !p.archived).map(p => {
    const data = marketData[instrumentId(p)], status = p.mapping !== 'confirmed' ? 'unresolved' : quoteState(data, now);
    const valid = !['unresolved', 'missing', 'stale'].includes(status) && data.quote.currency === p.currency;
    const nativeValue = valid ? Number(p.quantity) * data.quote.price : null;
    const nativePnl = nativeValue !== null && p.costBasis !== null ? nativeValue - Number(p.costBasis) : null;
    return { ...p, status, quote: data?.quote, nativeValue, nativePnl, value: convert(nativeValue, p.currency, currency, fx, now), pnl: convert(nativePnl, p.currency, currency, fx, now) };
  });
  const priced = rows.filter(p => p.value !== null), pnlRows = priced.filter(p => p.pnl !== null);
  const total = priced.reduce((n, p) => n + p.value, 0), pnl = pnlRows.reduce((n, p) => n + p.pnl, 0);
  const allocation = Object.entries(priced.reduce((a, p) => { const m = marketOf(p); a[m] = (a[m] || 0) + p.value; return a; }, {})).map(([market, value]) => ({ market, value, weight: total ? value / total : 0 }));
  return { rows: rows.map(p => ({ ...p, weight: p.value !== null && total > 0 ? p.value / total : null })), total: priced.length ? total : null, pnl: pnlRows.length ? pnl : null, priced: priced.length, pnlCount: pnlRows.length, count: rows.length, allocation, concentration: total > 0 ? Math.max(...priced.map(p => p.value / total)) : null };
}

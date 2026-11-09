'use client';
/* eslint-disable @next/next/no-img-element -- Local blob preview must not send a private screenshot to the image optimizer. */
import { useEffect, useRef, useState } from 'react';
import { CSV_HEADER, exchangeLabel } from '@/lib/terminal/domain';
import { IMAGE_COUNT_LIMIT, IMPORT_EXCHANGES, imageRowsCSV, validateScreenshotSelection } from '@/lib/terminal/imageImport';
import s from './terminal.module.css';
import i from './portfolioImport.module.css';

export default function PortfolioImport({ api, onComplete, market = 'All' }) {
  const [destination, setDestination] = useState(market);
  const [mode, setMode] = useState('image'), [images, setImages] = useState([]);
  const [rows, setRows] = useState([]), [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null), [checked, setChecked] = useState(false);
  const [account, setAccount] = useState(market === 'All' ? 'Default' : `${market} portfolio`), [asOf, setAsOf] = useState('');
  const [busy, setBusy] = useState(''), [error, setError] = useState('');
  const picker = useRef(null), request = useRef(null), review = useRef(null), confirmation = useRef(null);
  const objectURLs = useRef(new Set());
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { const urls = objectURLs.current; return () => { urls.forEach(url => URL.revokeObjectURL(url)); urls.clear(); }; }, []);
  useEffect(() => {
    if (!rows.length || busy) return;
    review.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    review.current?.focus({ preventScroll: true });
  }, [rows.length, busy]);
  useEffect(() => {
    if (!preview) return;
    confirmation.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
    confirmation.current?.focus({ preventScroll: true });
  }, [preview]);
  function resetPreview() { setPreview(null); setChecked(false); setError(''); }
  function choose(files) {
    if (busy || !files?.length) return;
    try {
      const selected = validateScreenshotSelection(files, images.length);
      const additions = selected.map(file => {
        const url = URL.createObjectURL(file); objectURLs.current.add(url);
        return { id: crypto.randomUUID(), file, url, status: 'pending', warnings: [], error: '' };
      });
      resetPreview(); setImages(current => [...current, ...additions]);
    } catch (e) { setError(e.message); }
  }
  function removeImage(image) {
    if (busy) return;
    URL.revokeObjectURL(image.url); objectURLs.current.delete(image.url);
    setImages(current => current.filter(item => item.id !== image.id));
    setRows(current => current.filter(row => row.sourceId !== image.id)); resetPreview();
  }
  async function readImages() {
    const pending = images.filter(image => image.status !== 'done');
    if (!pending.length || busy) return;
    resetPreview();
    const controller = new AbortController(); request.current = controller;
    const update = (id, change) => setImages(current => current.map(image => image.id === id ? { ...image, ...change } : image));
    let failed = 0;
    try {
      // One bounded request per image keeps a 10-image batch within hosting
      // upload limits and preserves successful results when another image fails.
      for (const [index, image] of pending.entries()) {
        if (controller.signal.aborted) break;
        setBusy(`Reading screenshot ${index + 1} of ${pending.length}…`);
        update(image.id, { status: 'reading', error: '' });
        try {
          const form = new FormData(); form.set('file', image.file);
          const response = await fetch('/api/terminal/run', { method: 'POST', body: form, signal: controller.signal, cache: 'no-store' });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw Object.assign(Error(result.error || 'This screenshot could not be read. Please retry.'), { status: response.status });
          if (!Array.isArray(result.holdings) || !result.holdings.length) throw Error('No readable holdings found. Replace this image with a clearer crop.');
          if (controller.signal.aborted) break;
          update(image.id, { status: 'done', count: result.holdings.length, warnings: result.warnings || [] });
          setRows(current => [...current.filter(row => row.sourceId !== image.id), ...result.holdings.map(row => ({ ...row, sourceId: image.id, sourceName: image.file.name }))]);
        } catch (e) {
          if (controller.signal.aborted) break;
          failed += 1; update(image.id, { status: 'error', error: e.message });
          // Stop on account-wide limits; leave the remaining images queued.
          if ([401, 403, 409, 429, 503].includes(e.status)) {
            setError(`${e.message} Your completed results are still available below. The remaining screenshots have not been read.`);
            return;
          }
        }
      }
      if (failed) setError(`${failed} ${failed === 1 ? 'screenshot needs' : 'screenshots need'} another try. Review the completed results below, or retry the unread images.`);
    } finally { if (!controller.signal.aborted) setBusy(''); }
  }
  function edit(index, key, value) {
    resetPreview(); setRows(current => current.map((row, n) => n === index ? { ...row, [key]: value } : row));
  }
  async function checkRows() {
    setBusy('Checking for duplicates…'); setError(''); setPreview(null);
    try {
      const content = mode === 'image' ? imageRowsCSV(rows, account, asOf ? new Date(asOf).toISOString() : '') : csv;
      const result = await api('', { action: 'import_preview', csv: content, market: destination });
      setPreview({ ...result, csv: content }); setChecked(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }
  async function save() {
    setBusy('Saving your holdings…'); setError('');
    try {
      const result = await api('', { action: 'import_commit', market: destination, csv: preview.csv, version: preview.version, rows: preview.preview.filter(row => row.status === 'ready').map(row => row.row) });
      await onComplete(result);
    } catch (e) { setError(e.message); if (e.status === 409) setPreview(null); }
    finally { setBusy(''); }
  }
  const field = (row, index, key, label, props = {}) => <label>{label}<input {...props} disabled={!!busy} aria-label={`${label}, holding ${index + 1}`} value={row[key] || ''} onChange={e => edit(index, key, key === 'symbol' ? e.target.value.toUpperCase() : e.target.value)}/></label>;
  const ready = preview?.preview.filter(row => row.status === 'ready').length || 0;
  const unread = images.filter(image => image.status !== 'done').length;
  const warnings = images.flatMap(image => image.warnings.map(warning => `${image.file.name}: ${warning}`));
  return <div className={`${s.form} ${i.importer}`}>
    <p className={i.intro}>Bring your holdings from ICICI Direct, Wio or another app. Review the details, then save.</p>
    <label>Save into portfolio<select aria-label="Save into portfolio" disabled={!!busy} value={destination} onChange={e => { setDestination(e.target.value); resetPreview(); }}><option value="US">US portfolio · USD</option><option value="India">India portfolio · INR</option><option value="All">Automatically split by market</option></select></label><p className={i.privacy}>Stocks, ETFs and mutual funds. Each holding keeps its native currency. Rows from another market must be imported into the matching portfolio.</p><div className={i.tabs} role="tablist" aria-label="Import format">{[['image', 'Screenshot'], ['csv', 'CSV file']].map(([value, label]) => <button type="button" role="tab" aria-selected={mode === value} disabled={!!busy} key={value} onClick={() => { setMode(value); resetPreview(); }}>{label}</button>)}</div>
    {mode === 'image' ? <>
      <div className={i.dropzone} tabIndex={0} aria-label="Drop or paste up to 10 portfolio screenshots" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files); }} onPaste={e => { const files = [...e.clipboardData.files].filter(f => f.type.startsWith('image/')); if (files.length) { e.preventDefault(); choose(files); } }}>
        {!images.length && <span className={i.uploadIcon} aria-hidden="true">↥</span>}
        <strong>{images.length ? `${images.length} of ${IMAGE_COUNT_LIMIT} screenshots added` : 'Drop your portfolio screenshots here'}</strong>
        <span>Up to 10 images · PNG, JPEG or WebP · 3 MB each · or paste screenshots</span>
        <input ref={picker} className={i.fileInput} tabIndex={-1} aria-label="Portfolio screenshots" type="file" multiple accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" disabled={!!busy} onChange={e => { choose(e.target.files); e.target.value = ''; }}/>
        <button type="button" disabled={!!busy || images.length >= IMAGE_COUNT_LIMIT} onClick={() => picker.current.click()}>{images.length ? 'Add more screenshots' : 'Choose screenshots'}</button>
      </div>
      <p className={i.privacy}>“Read screenshots” sends the selected images to OpenAI, one at a time. Each image uses one AI read from your daily allowance. Crop out account numbers and personal details first. StockedBy does not store the images. Nothing is added until you confirm.</p>
      <button className={rows.length ? undefined : s.primary} disabled={!unread || !!busy} onClick={readImages}>{busy.startsWith('Reading screenshot') ? busy : !unread && images.length ? 'All screenshots read' : `Read ${unread || ''} ${unread === 1 ? 'screenshot' : 'screenshots'} with AI`}</button>
      {error && <p role="alert" className={s.error}>{error}</p>}
      {images.length > 0 && <ul className={i.imageList} tabIndex={0} aria-label="Selected screenshots">{images.map(image => <li className={i.imageItem} key={image.id}>
        <img src={image.url} alt={`Preview of ${image.file.name}`}/>
        <div><strong>{image.file.name}</strong><span>{image.status === 'done' ? `${image.count} ${image.count === 1 ? 'holding' : 'holdings'} found` : image.status === 'reading' ? 'Reading…' : image.status === 'error' ? 'Needs another try' : 'Ready to read'}</span>{image.error && <p>{image.error}</p>}</div>
        <button type="button" aria-label={`Remove ${image.file.name}`} disabled={!!busy} onClick={() => removeImage(image)}>×</button>
      </li>)}</ul>}
      {warnings.length > 0 && <div className={s.notice}><strong>Check against your screenshot</strong><ul>{warnings.map((warning, n) => <li key={n}>{warning}</li>)}</ul></div>}
      {rows.length > 0 && <section ref={review} tabIndex={-1} className={i.rows} aria-label="Review extracted holdings">
        <div className={i.sectionHeading}><h3>{rows.length} {rows.length === 1 ? 'holding' : 'holdings'} found</h3><span>Edit any value. Untick rows you don’t want.</span></div>
        <div className={s.formGrid}><label>Account label<input value={account} maxLength={120} disabled={!!busy} placeholder="e.g. Wio US" onChange={e => { setAccount(e.target.value); resetPreview(); }}/></label><label>Snapshot date & time (optional)<input type="datetime-local" value={asOf} disabled={!!busy} onChange={e => { setAsOf(e.target.value); resetPreview(); }}/></label></div>
        {rows.map((row, index) => <article className={i.row} key={index}>
          <label className={i.rowTitle}><input type="checkbox" checked={row.selected !== false} disabled={!!busy} onChange={e => edit(index, 'selected', e.target.checked)}/><strong>{row.name || `Holding ${index + 1}`}</strong></label>
          <span className={i.source}>From {row.sourceName}</span>
          {row.issues.length > 0 && <p className={i.uncertain}>{row.issues.join(' ')}</p>}
          {row.selected !== false && <div className={i.fields}>
            {field(row, index, 'name', 'Name')}{field(row, index, 'symbol', row.assetClass === 'mutual_fund' ? 'Fund ticker / scheme code / ISIN' : 'Ticker')}
            <label>Exchange<select aria-label={`Exchange, holding ${index + 1}`} value={row.exchange} disabled={!!busy} onChange={e => edit(index, 'exchange', e.target.value)}>{IMPORT_EXCHANGES.map(x => <option value={x} key={x}>{exchangeLabel(x)}</option>)}</select></label>
            <label>Currency<select aria-label={`Currency, holding ${index + 1}`} value={row.currency} disabled={!!busy} onChange={e => edit(index, 'currency', e.target.value)}><option value="">Choose…</option><option>INR</option><option>USD</option></select></label>
            <label>Asset type<select aria-label={`Asset type, holding ${index + 1}`} value={row.assetClass} disabled={!!busy} onChange={e => edit(index, 'assetClass', e.target.value)}><option value="">Choose…</option><option value="equity">Stock</option><option value="etf">ETF</option><option value="mutual_fund">Mutual fund</option></select></label>
            {field(row, index, 'quantity', 'Shares / units', { inputMode: 'decimal' })}
            {field(row, index, 'costBasis', 'Total invested cost (optional)', { inputMode: 'decimal' })}
            {field(row, index, 'snapshotValue', 'Snapshot value (optional)', { inputMode: 'decimal' })}
          </div>}
        </article>)}
        <p className={i.privacy}>Use total invested cost, not average price. Screenshot values are historical snapshots, never live prices. Listing matches remain unverified until you confirm them in your portfolio.</p>
      </section>}
    </> : <>
      <p>Use assetClass mutual_fund for funds, INMF / USMF for the fund registry, and the exact fund ticker, scheme code or ISIN in symbol. Use the template columns. You can correct the CSV below before importing.</p>
      <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_HEADER + '\n')}`} download="stockedby-template.csv">Download CSV template ↗</a>
      <label>Choose CSV<input type="file" accept=".csv,text/csv" disabled={!!busy} onChange={async e => { const f = e.target.files[0]; if (!f) return; resetPreview(); if (f.size > 500000) { setError('Use a CSV under 500 KB.'); return; } setCsv(await f.text()); }}/></label>
      <label>CSV contents<textarea rows={6} value={csv} disabled={!!busy} onChange={e => { setCsv(e.target.value); resetPreview(); }}/></label>
    </>}
    {(mode === 'csv' || rows.length > 0) && <button disabled={!!busy || (mode === 'csv' ? !csv : !rows.some(row => row.selected !== false))} onClick={checkRows}>Check holdings before saving</button>}
    {preview && <section ref={confirmation} tabIndex={-1} className={i.confirm} aria-label="Confirm portfolio import">
      <h3>{ready} {ready === 1 ? 'holding' : 'holdings'} ready to add</h3>
      {mode === 'image' && unread > 0 && <p className={i.uncertain}>{unread} {unread === 1 ? 'screenshot has' : 'screenshots have'} not been read. This import includes only the completed screenshots.</p>}
      <div className={s.tableWrap}><table><thead><tr><th>Holding</th><th>Units</th><th>Result</th></tr></thead><tbody>{preview.preview.map((row, index) => <tr key={index}><td>{row.position?.symbol || `Row ${row.row}`}<small>{row.position?.exchange}</small></td><td>{row.position?.quantity || '—'}</td><td>{row.status}<small>{row.message}</small></td></tr>)}</tbody></table></div>
      <label className={i.rowTitle}><input type="checkbox" checked={checked} disabled={!!busy} onChange={e => setChecked(e.target.checked)}/><span>I checked the tickers, units, currencies and costs against my original.</span></label>
      <p className={i.privacy}>Saving starts a news check for your India and US holdings and enables daily tracking, unless you paused it in Settings. Only company/fund names and identifiers are used for news research. Quantities and account details stay private.</p>
      <button className={s.primary} disabled={!!busy || !ready || !checked} onClick={save}>Add {ready} {ready === 1 ? 'holding' : 'holdings'} to {destination === 'All' ? 'my portfolios' : `my ${destination} portfolio`}</button>
    </section>}
    {busy && <p role="status">{busy}</p>}
    {error && mode === 'csv' && <p role="alert" className={s.error}>{error}</p>}
  </div>;
}

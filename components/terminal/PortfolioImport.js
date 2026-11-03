'use client';
/* eslint-disable @next/next/no-img-element -- Local blob preview must not send a private screenshot to the image optimizer. */
import { useEffect, useRef, useState } from 'react';
import { CSV_HEADER } from '@/lib/terminal/domain';
import { IMAGE_LIMIT, IMPORT_EXCHANGES, imageRowsCSV } from '@/lib/terminal/imageImport';
import s from './terminal.module.css';
import i from './portfolioImport.module.css';

export default function PortfolioImport({ api, onComplete }) {
  const [mode, setMode] = useState('image'), [file, setFile] = useState(null), [url, setUrl] = useState('');
  const [rows, setRows] = useState([]), [warnings, setWarnings] = useState([]), [csv, setCsv] = useState('');
  const [preview, setPreview] = useState(null), [checked, setChecked] = useState(false);
  const [account, setAccount] = useState('Default'), [asOf, setAsOf] = useState('');
  const [busy, setBusy] = useState(''), [error, setError] = useState('');
  const picker = useRef(null), request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  function resetPreview() { setPreview(null); setChecked(false); setError(''); }
  function choose(image) {
    if (busy || !image) return;
    resetPreview(); setRows([]); setWarnings([]); setFile(null); setUrl('');
    if (!/\.(png|jpe?g|webp)$/i.test(image.name) || !['image/png', 'image/jpeg', 'image/webp'].includes(image.type)) { setError('Choose a PNG, JPEG or WebP screenshot.'); return; }
    if (image.size > IMAGE_LIMIT) { setError('Use a screenshot smaller than 3 MB. Crop to the holdings table.'); return; }
    setFile(image); setUrl(URL.createObjectURL(image));
  }
  async function readImage() {
    setBusy('Reading your screenshot…'); resetPreview(); setRows([]); setWarnings([]);
    request.current = new AbortController();
    try {
      const form = new FormData(); form.set('file', file);
      const response = await fetch('/api/terminal/import-image', { method: 'POST', body: form, signal: request.current.signal, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'The image could not be read. Please retry.');
      setRows(result.holdings); setWarnings(result.warnings);
      if (!result.holdings.length) setError('No readable holdings were found. Try a clearer screenshot of the holdings table.');
    } catch (e) { if (e.name !== 'AbortError') setError(e.message); }
    finally { setBusy(''); }
  }
  function edit(index, key, value) {
    resetPreview(); setRows(current => current.map((row, n) => n === index ? { ...row, [key]: value } : row));
  }
  async function checkRows() {
    setBusy('Checking for duplicates…'); setError(''); setPreview(null);
    try {
      const content = mode === 'image' ? imageRowsCSV(rows, account, asOf ? new Date(asOf).toISOString() : '') : csv;
      const result = await api('', { action: 'import_preview', csv: content });
      setPreview({ ...result, csv: content }); setChecked(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(''); }
  }
  async function save() {
    setBusy('Saving your holdings…'); setError('');
    try {
      await api('', { action: 'import_commit', csv: preview.csv, version: preview.version, rows: preview.preview.filter(row => row.status === 'ready').map(row => row.row) });
      await onComplete();
    } catch (e) { setError(e.message); if (e.status === 409) setPreview(null); }
    finally { setBusy(''); }
  }
  const field = (row, index, key, label, props = {}) => <label>{label}<input {...props} disabled={!!busy} aria-label={`${label}, holding ${index + 1}`} value={row[key] || ''} onChange={e => edit(index, key, key === 'symbol' ? e.target.value.toUpperCase() : e.target.value)}/></label>;
  const ready = preview?.preview.filter(row => row.status === 'ready').length || 0;
  return <div className={`${s.form} ${i.importer}`}>
    <p className={i.intro}>Bring your holdings from ICICI Direct, Wio or another app. Review the details, then save.</p>
    <div className={i.tabs} role="tablist" aria-label="Import format">{[['image', 'Screenshot'], ['csv', 'CSV file']].map(([value, label]) => <button type="button" role="tab" aria-selected={mode === value} disabled={!!busy} key={value} onClick={() => { setMode(value); resetPreview(); }}>{label}</button>)}</div>
    {mode === 'image' ? <>
      <div className={i.dropzone} tabIndex={0} aria-label="Drop or paste a portfolio screenshot" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0]); }} onPaste={e => { const image = [...e.clipboardData.files].find(f => f.type.startsWith('image/')); if (image) { e.preventDefault(); choose(image); } }}>
        {url ? <img src={url} alt="Your selected portfolio screenshot" className={i.previewImage}/> : <span className={i.uploadIcon} aria-hidden="true">↥</span>}
        <strong>{file ? file.name : 'Drop your portfolio screenshot here'}</strong>
        <span>PNG, JPEG or WebP · up to 3 MB · you can also paste an image</span>
        <input ref={picker} className={i.fileInput} tabIndex={-1} aria-label="Portfolio screenshot" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" disabled={!!busy} onChange={e => { choose(e.target.files[0]); e.target.value = ''; }}/>
        <button type="button" disabled={!!busy} onClick={() => picker.current.click()}>{file ? 'Choose another screenshot' : 'Choose screenshot'}</button>
      </div>
      <p className={i.privacy}>“Read screenshot” sends this image to OpenAI to extract holdings. Crop out account numbers and personal details first. StockedBy does not store the image. Nothing is added to your portfolio until you confirm.</p>
      <button className={s.primary} disabled={!file || !!busy} onClick={readImage}>{busy === 'Reading your screenshot…' ? busy : rows.length ? 'Read screenshot again' : 'Read screenshot with AI'}</button>
      {warnings.length > 0 && <div className={s.notice}><strong>Check against your screenshot</strong><ul>{warnings.map((warning, n) => <li key={n}>{warning}</li>)}</ul></div>}
      {rows.length > 0 && <section className={i.rows} aria-label="Review extracted holdings">
        <div className={i.sectionHeading}><h3>{rows.length} {rows.length === 1 ? 'holding' : 'holdings'} found</h3><span>Edit any value. Untick rows you don’t want.</span></div>
        <div className={s.formGrid}><label>Account label<input value={account} maxLength={120} disabled={!!busy} placeholder="e.g. Wio US" onChange={e => { setAccount(e.target.value); resetPreview(); }}/></label><label>Snapshot date & time (optional)<input type="datetime-local" value={asOf} disabled={!!busy} onChange={e => { setAsOf(e.target.value); resetPreview(); }}/></label></div>
        {rows.map((row, index) => <article className={i.row} key={index}>
          <label className={i.rowTitle}><input type="checkbox" checked={row.selected !== false} disabled={!!busy} onChange={e => edit(index, 'selected', e.target.checked)}/><strong>{row.name || `Holding ${index + 1}`}</strong></label>
          {row.issues.length > 0 && <p className={i.uncertain}>{row.issues.join(' ')}</p>}
          {row.selected !== false && <div className={i.fields}>
            {field(row, index, 'name', 'Name')}{field(row, index, 'symbol', 'Ticker')}
            <label>Exchange<select aria-label={`Exchange, holding ${index + 1}`} value={row.exchange} disabled={!!busy} onChange={e => edit(index, 'exchange', e.target.value)}>{IMPORT_EXCHANGES.map(x => <option value={x} key={x}>{x === 'UNRESOLVED' ? 'Not known yet' : x}</option>)}</select></label>
            <label>Currency<select aria-label={`Currency, holding ${index + 1}`} value={row.currency} disabled={!!busy} onChange={e => edit(index, 'currency', e.target.value)}><option value="">Choose…</option><option>INR</option><option>USD</option></select></label>
            <label>Asset type<select aria-label={`Asset type, holding ${index + 1}`} value={row.assetClass} disabled={!!busy} onChange={e => edit(index, 'assetClass', e.target.value)}><option value="">Choose…</option><option value="equity">Stock</option><option value="etf">ETF</option></select></label>
            {field(row, index, 'quantity', 'Shares / units', { inputMode: 'decimal' })}
            {field(row, index, 'costBasis', 'Total invested cost (optional)', { inputMode: 'decimal' })}
            {field(row, index, 'snapshotValue', 'Snapshot value (optional)', { inputMode: 'decimal' })}
          </div>}
        </article>)}
        <p className={i.privacy}>Use total invested cost, not average price. Screenshot values are historical snapshots, never live prices. Listing matches remain unverified until you confirm them in your portfolio.</p>
      </section>}
    </> : <>
      <p>Use the template columns. You can correct the CSV below before importing.</p>
      <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_HEADER + '\n')}`} download="stockedby-template.csv">Download CSV template ↗</a>
      <label>Choose CSV<input type="file" accept=".csv,text/csv" disabled={!!busy} onChange={async e => { const f = e.target.files[0]; if (!f) return; resetPreview(); if (f.size > 500000) { setError('Use a CSV under 500 KB.'); return; } setCsv(await f.text()); }}/></label>
      <label>CSV contents<textarea rows={6} value={csv} disabled={!!busy} onChange={e => { setCsv(e.target.value); resetPreview(); }}/></label>
    </>}
    {(mode === 'csv' || rows.length > 0) && <button disabled={!!busy || (mode === 'csv' ? !csv : !rows.some(row => row.selected !== false))} onClick={checkRows}>Check holdings before saving</button>}
    {preview && <section className={i.confirm}>
      <h3>{ready} {ready === 1 ? 'holding' : 'holdings'} ready to add</h3>
      <div className={s.tableWrap}><table><thead><tr><th>Holding</th><th>Units</th><th>Result</th></tr></thead><tbody>{preview.preview.map((row, index) => <tr key={index}><td>{row.position?.symbol || `Row ${row.row}`}<small>{row.position?.exchange}</small></td><td>{row.position?.quantity || '—'}</td><td>{row.status}<small>{row.message}</small></td></tr>)}</tbody></table></div>
      <label className={i.rowTitle}><input type="checkbox" checked={checked} disabled={!!busy} onChange={e => setChecked(e.target.checked)}/><span>I checked the tickers, units, currencies and costs against my original.</span></label>
      <button className={s.primary} disabled={!!busy || !ready || !checked} onClick={save}>Add {ready} {ready === 1 ? 'holding' : 'holdings'} to my portfolio</button>
    </section>}
    {busy && <p role="status">{busy}</p>}
    {error && <p role="alert" className={s.error}>{error}</p>}
  </div>;
}

// Uses fictional holdings and intercepted APIs only. No OpenAI calls or saved portfolio changes.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { importPreview } from '../lib/terminal/domain.js';
import { FEED_COVERAGE } from '../lib/terminal/feeds.js';

const base = process.env.TERMINAL_TEST_URL || 'http://127.0.0.1:3007';
const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZt0AAAAASUVORK5CYII=', 'base64');
const files = Array.from({ length: 11 }, (_, n) => ({ name: `holdings-${n + 1}.png`, mimeType: 'image/png', buffer }));
const holding = n => ({ name: `Fictional holding ${n}`, symbol: `TEST${n}`, exchange: 'NASDAQ', currency: 'USD', assetClass: 'equity', quantity: '1.123456789', costBasis: '', snapshotValue: '123.45', issues: [], selected: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const pageErrors = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.on('pageerror', e => pageErrors.push(e.message));
    const state = { document: { positions: [], watchlist: [], screens: [], settings: { currency: 'USD' } }, version: 1, cache: {}, runs: [], alerts: [], user: { email: 'fictional@example.com', owner: true }, feeds: FEED_COVERAGE };
    const calls = []; let failure = 'once', active = 0, maxActive = 0, commits = 0;
    await context.route('**/api/terminal**', async route => {
      if (route.request().method() === 'GET') return route.fulfill({ json: state });
      if (route.request().headers()['content-type']?.startsWith('multipart/form-data')) {
        const name = route.request().postDataBuffer().toString().match(/filename="([^"]+)"/)[1];
        calls.push(name); active++; maxActive = Math.max(maxActive, active);
        await new Promise(resolve => setTimeout(resolve, 60)); active--;
        if (name === 'holdings-3.png' && failure === 'once') { failure = ''; return route.fulfill({ status: 502, json: { error: 'Fictional unreadable image. Please retry.' } }); }
        if (name === 'holdings-2.png' && failure === 'quota') { failure = ''; return route.fulfill({ status: 429, json: { error: 'Daily limit reached.' } }); }
        const n = Number(name.match(/\d+/)?.[0] || 1);
        return route.fulfill({ json: { holdings: [holding(n === 2 ? 1 : n)], warnings: [] } });
      }
      const body = route.request().postDataJSON();
      if (body.action === 'import_preview') return route.fulfill({ json: { preview: importPreview(body.csv, state.document.positions), version: state.version } });
      if (body.action === 'import_commit') {
        const rows = importPreview(body.csv, state.document.positions).filter(row => row.status === 'ready' && body.rows.includes(row.row));
        state.document.positions.push(...rows.map(row => row.position)); commits++; state.version++;
        return route.fulfill({ json: { version: state.version } });
      }
      return route.fulfill({ json: {} });
    });
    const open = async () => { await page.goto(base + '/terminal'); await page.getByRole('button', { name: 'Import portfolio', exact: true }).filter({ visible: true }).first().click(); };
    await open();
    const picker = page.getByLabel('Portfolio screenshots', { exact: true });
    assert.equal(await picker.getAttribute('multiple'), '');
    await picker.setInputFiles(files.slice(0, 10));
    await page.getByText('10 of 10 screenshots added', { exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollWidth <= el.clientWidth), true);
    await page.screenshot({ path: `/tmp/stockedby-ten-images-upload-${width}.png`, fullPage: false });
    assert.equal(await page.getByRole('button', { name: 'Add more screenshots' }).isDisabled(), true);
    await picker.setInputFiles(files[10]);
    await page.getByRole('alert').filter({ hasText: 'up to 10 screenshots' }).waitFor();
    assert.equal(await page.getByRole('list', { name: 'Selected screenshots' }).getByRole('listitem').count(), 10);
    await page.getByRole('button', { name: 'Remove holdings-10.png', exact: true }).click();
    await picker.setInputFiles(files[10]);
    await page.getByRole('button', { name: 'Read 10 screenshots with AI', exact: true }).click();
    await page.getByRole('heading', { name: '9 holdings found', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Read 1 screenshot with AI', exact: true }).waitFor({ state: 'visible' });
    assert.equal(calls.length, 10); assert.equal(maxActive, 1);
    await page.getByLabel('Shares / units, holding 1', { exact: true }).fill('5');
    await page.getByRole('button', { name: 'Read 1 screenshot with AI', exact: true }).click();
    await page.getByRole('heading', { name: '10 holdings found', exact: true }).waitFor();
    assert.equal(calls.length, 11); assert.equal(calls.at(-1), 'holdings-3.png');
    assert.equal(await page.getByLabel('Shares / units, holding 1', { exact: true }).inputValue(), '5');
    assert.equal(await page.getByText('From holdings-3.png', { exact: true }).count(), 1);
    await page.getByRole('button', { name: 'Check holdings before saving' }).click();
    await page.getByRole('heading', { name: '9 holdings ready to add', exact: true }).waitFor();
    await page.getByRole('cell', { name: /^conflict/ }).waitFor();
    const add = page.getByRole('button', { name: 'Add 9 holdings to my portfolios', exact: true });
    assert.equal(await add.isDisabled(), true); assert.equal(commits, 0);
    await page.getByLabel('I checked the matched listings, fund plans, units, currencies and costs against my original.').check();
    assert.equal(await add.isEnabled(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `/tmp/stockedby-ten-images-review-${width}.png`, fullPage: false });
    await add.click(); await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.equal(commits, 1); assert.equal(state.document.positions.length, 9);
    await page.getByRole('region', { name: 'News affecting your holdings' }).getByRole('heading', { name: 'What matters to your portfolio.', exact: true }).waitFor();
    // Account-wide failures stop the queue and preserve completed results for retry.
    state.document.positions = []; calls.length = 0; failure = 'quota';
    await open(); await picker.setInputFiles(files.slice(0, 3));
    await page.getByRole('button', { name: 'Read 3 screenshots with AI', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Daily limit reached' }).waitFor();
    assert.equal(calls.length, 2);
    await page.getByRole('button', { name: 'Read 2 screenshots with AI', exact: true }).click();
    await page.getByRole('heading', { name: '3 holdings found', exact: true }).waitFor();
    assert.equal(calls.length, 4); assert.equal(calls.filter(name => name === 'holdings-1.png').length, 1);
    await page.getByRole('button', { name: 'Remove holdings-1.png', exact: true }).click();
    await page.getByRole('heading', { name: '2 holdings found', exact: true }).waitFor();
    assert.equal(await page.getByText('From holdings-1.png', { exact: true }).count(), 0);
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await open();
    // Exercise the real drop/paste handlers with multiple files.
    const dropzone = page.getByLabel('Drop or paste up to 10 portfolio screenshots', { exact: true });
    await dropzone.evaluate(el => {
      const data = new DataTransfer();
      for (let n = 1; n <= 2; n++) data.items.add(new File(['fictional'], `pasted-${n}.png`, { type: 'image/png' }));
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true }));
    });
    await page.getByText('2 of 10 screenshots added', { exact: true }).waitFor();
    await dropzone.evaluate(el => {
      const data = new DataTransfer();
      for (let n = 1; n <= 3; n++) data.items.add(new File(['fictional'], `dropped-${n}.png`, { type: 'image/png' }));
      el.dispatchEvent(new DragEvent('drop', { dataTransfer: data, bubbles: true, cancelable: true }));
    });
    await page.getByText('5 of 10 screenshots added', { exact: true }).waitFor();
    await picker.setInputFiles({ name: 'bad.pdf', mimeType: 'application/pdf', buffer });
    await page.getByRole('alert').filter({ hasText: 'PNG, JPEG or WebP' }).waitFor();
    assert.equal(await page.getByRole('list', { name: 'Selected screenshots' }).getByRole('listitem').count(), 5);
    // CSV remains available after switching formats.
    await page.getByRole('tab', { name: 'CSV file' }).click();
    await page.getByLabel('CSV contents').fill('name,symbol,exchange,currency,quantity\nFictional CSV,CSVTEST,NASDAQ,USD,2');
    await page.getByRole('button', { name: 'Check holdings before saving' }).click();
    await page.getByRole('heading', { name: '1 holding ready to add', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Add 1 holding to my portfolios' }).isDisabled(), true);
    await context.close();
    console.log(`Passed ${width}px: ten images, limit, removal, partial failure, retry, preserved edits, duplicate/conflict review, confirmation, quota stop/resume, drop, paste, CSV.`);
  }
  assert.deepEqual(pageErrors, []);
} finally { await browser.close(); }

import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { imageImportRequest, parseImageImport, imageRowsCSV } from './imageImport.js';
import { importPreview, valuePortfolio, MARKETS } from './domain.js';
import { themeBootstrap } from './appearance.js';
import { scan } from './scan.js';
const row = overrides => ({ name: 'Example, "Inc"', symbol: 'EXAMPLE', exchange: 'NASDAQ', currency: 'USD', assetClass: 'equity', quantity: '1.123456789012345678', costBasis: '', snapshotValue: '123.45', issues: [], ...overrides });
const response = holdings => ({ status: 'completed', output_text: JSON.stringify({ warnings: [], holdings }) });

test('OCR keeps exact units and unknown cost; snapshots never become a live valuation', () => {
  const draft = parseImageImport(response([row({ accountNumber: 'DO_NOT_RETAIN' })]));
  assert.equal(draft.holdings[0].quantity, '1.123456789012345678');
  assert.equal(draft.holdings[0].costBasis, '');
  assert.ok(!JSON.stringify(draft).includes('DO_NOT_RETAIN'));
  const [preview] = importPreview(imageRowsCSV(draft.holdings, 'Fictional account'));
  assert.equal(preview.status, 'ready');
  assert.equal(preview.position.name, 'Example, "Inc"');
  assert.equal(preview.position.costBasis, null);
  assert.equal(preview.position.mapping, 'unresolved');
  assert.equal(valuePortfolio([preview.position], {}, null, 'USD').total, null);
});

test('OCR does not silently turn ambiguous or negative numbers into valid holdings', () => {
  const draft = parseImageImport(response([row({ quantity: '1,23?', costBasis: '-100' })]));
  assert.equal(draft.holdings[0].quantity, '');
  assert.equal(draft.holdings[0].costBasis, '');
  assert.equal(draft.holdings[0].issues.length, 2);
  assert.throws(() => imageRowsCSV(draft.holdings), /Quantity is required/);
  assert.throws(() => imageRowsCSV([row({ quantity: '0' })]), /greater than zero/);
  assert.throws(() => imageRowsCSV([row({ exchange: 'NSE' })]), /INR/);
  assert.throws(() => imageRowsCSV([row({ currency: '' })]), /currency/);
});

test('an unknown exchange cannot duplicate an existing known listing', () => {
  const [known] = importPreview(imageRowsCSV([row()]));
  const unknown = imageRowsCSV([row({ exchange: 'UNRESOLVED' })]);
  assert.equal(importPreview(unknown, [known.position])[0].status, 'duplicate');
  assert.equal(importPreview(imageRowsCSV([row({ exchange: 'UNRESOLVED', quantity: '2' })]), [known.position])[0].status, 'conflict');
  assert.equal(importPreview(unknown + '\n' + imageRowsCSV([row()]).split('\n')[1])[1].status, 'duplicate');
  assert.equal(importPreview(imageRowsCSV([row()], 'Other account'), [known.position])[0].status, 'ready');
});

test('incomplete OCR responses are rejected; excluded rows stay out of the import', () => {
  assert.throws(() => parseImageImport({ ...response([]), status: 'incomplete' }), /not read completely/);
  assert.throws(() => parseImageImport({ status: 'completed', output_text: '{' }), /incomplete result/);
  assert.throws(() => parseImageImport(response(Array.from({ length: 61 }, () => row()))), /validated/);
  assert.throws(() => imageRowsCSV([row({ selected: false })]), /at least one/);
  assert.equal(importPreview(imageRowsCSV([row(), row({ symbol: 'EXCLUDED', selected: false })])).length, 1);
  const request = imageImportRequest(Buffer.from('fixture'), 'image/png');
  assert.equal(request.store, false);
  assert.equal(request.text.format.strict, true);
  assert.equal(request.tools, undefined);
});

test('dark mode is the default, with explicit light preference and storage-denied support', () => {
  for (const [stored, expected] of [[null, 'dark'], ['dark', 'dark'], ['light', 'light'], ['invalid', 'dark']]) {
    const document = { documentElement: { dataset: {} } };
    vm.runInNewContext(themeBootstrap, { document, localStorage: { getItem: () => stored } });
    assert.equal(document.documentElement.dataset.stockedbyTheme, expected);
  }
  const document = { documentElement: { dataset: {} } };
  vm.runInNewContext(themeBootstrap, { document, localStorage: { getItem: () => { throw Error('blocked'); } } });
  assert.equal(document.documentElement.dataset.stockedbyTheme, 'dark');
});

test('scans fetch India and US only while leaving legacy holdings intact', async () => {
  assert.deepEqual(MARKETS, ['India', 'US']);
  const positions = [row({ symbol: 'USSTOCK', mapping: 'confirmed' }), row({ symbol: 'INDIA', exchange: 'NSE', currency: 'INR', mapping: 'confirmed' }), row({ symbol: 'LEGACY', exchange: 'DFM', currency: 'AED', mapping: 'confirmed' })];
  const fetched = [];
  const store = async action => action === 'begin' ? { id: 'fixture', lease: 'fixture' } : action === 'load' ? { document: { positions, settings: {} }, cache: {}, runs: [] } : null;
  await scan(store, { kind: 'refresh' }, { fetchFX: async () => ({}), fetchNews: async () => ({ items: [], failures: [] }), fetchInstrument: async p => { fetched.push(p.symbol); return { unavailable: 'Fixture' }; } });
  assert.deepEqual(fetched.sort(), ['INDIA', 'USSTOCK']);
  assert.equal(positions.length, 3);
});

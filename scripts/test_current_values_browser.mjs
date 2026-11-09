// Fictional imports and API responses only; no personal holdings or paid AI calls.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { importPreview, instrumentId, normalizeState } from '../lib/terminal/domain.js';
import { FEED_COVERAGE } from '../lib/terminal/feeds.js';
const base=process.env.TERMINAL_TEST_URL||'http://localhost:3004';
const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
const buffer=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZt0AAAAASUVORK5CYII=','base64');
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const state={document:{positions:[],watchlist:[],screens:[],settings:{currency:'USD'}},version:1,cache:{},runs:[],alerts:[],feeds:FEED_COVERAGE,user:{email:'fictional@example.com',owner:true}};
  const rows=[{name:'Fictional US stock',symbol:'USCO',exchange:'NASDAQ',currency:'USD',assetClass:'equity',quantity:'2.25',snapshotValue:'9000'},{name:'Fictional India fund Direct Growth',symbol:'123456',exchange:'INMF',currency:'INR',assetClass:'mutual_fund',quantity:'12.5',snapshotValue:'999'},{name:'Fictional unavailable',symbol:'MISSING',exchange:'NYSE',currency:'USD',assetClass:'equity',quantity:'1',snapshotValue:'123'}].map(p=>({...p,costBasis:'100',issues:[],selected:true}));
  let quoteCalls=0;
  await context.route('**/api/terminal**',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:state});
   if(route.request().headers()['content-type']?.startsWith('multipart/form-data'))return route.fulfill({json:{holdings:rows,warnings:[]}});
   const body=route.request().postDataJSON();
   if(body.mode==='find_listing')return route.fulfill({json:{listings:[{name:'Fictional India fund Direct Growth',symbol:'123456',exchange:'INMF',currency:'INR',assetClass:'mutual_fund'}]}});
   if(body.mode==='quotes') {
    quoteCalls++;
    for(const p of body.instruments)assert.deepEqual(Object.keys(p).sort(),['assetClass','currency','exchange','symbol']);
    const prices=Object.fromEntries(body.instruments.map(p=>[instrumentId(p),p.symbol==='MISSING'?{unavailable:'Fictional provider coverage gap'}:{...p,instrumentId:instrumentId(p),name:rows.find(r=>r.symbol===p.symbol)?.name||'Fictional match',provider:'Fictional price provider',source:'https://example.com/quote',quote:{price:p.currency==='INR'?20:100,currency:p.currency,asOf:new Date().toISOString(),quality:p.assetClass==='mutual_fund'?'daily NAV':'delayed'}}]));
    if(body.persist)Object.assign(state.cache,prices);
    return route.fulfill({json:{prices}});
   }
   if(body.action==='import_preview')return route.fulfill({json:{preview:importPreview(body.csv,state.document.positions,{market:body.market}),version:state.version}});
   if(body.action==='import_commit'){state.document.positions.push(...importPreview(body.csv,state.document.positions,{market:body.market}).filter(r=>r.status==='ready'&&body.rows.includes(r.row)).map(r=>r.position));state.version++;return route.fulfill({json:{version:state.version}});}
   if(body.action==='save'){state.document=normalizeState(body.document);state.version++;return route.fulfill({json:{version:state.version}});}
   return route.fulfill({json:{}});
  });
  await page.goto(base+'/terminal');
  await page.getByRole('button',{name:'Import portfolio',exact:true}).first().click();
  const dialog=page.getByRole('dialog');
  await page.getByLabel('Portfolio screenshots',{exact:true}).setInputFiles({name:'fictional.png',mimeType:'image/png',buffer});
  await dialog.getByRole('button',{name:'Read 1 screenshot with AI',exact:true}).click();
  const us=dialog.getByLabel('Current value for Fictional US stock',{exact:true});
  await us.getByText('$225.00',{exact:true}).waitFor();
  await dialog.getByLabel('Current value for Fictional India fund Direct Growth',{exact:true}).getByText('₹250.00',{exact:true}).waitFor();
  await dialog.getByText('Fictional provider coverage gap',{exact:true}).waitFor();
  assert.equal(await dialog.getByLabel('Snapshot value (optional), holding 1',{exact:true}).count(),0);
  const before=quoteCalls;
  await dialog.getByLabel('Shares / units, holding 1',{exact:true}).fill('3.5');
  await us.getByText('$350.00',{exact:true}).waitFor();assert.equal(quoteCalls,before);
  assert.equal(await us.getByRole('textbox').count(),0);
  await us.scrollIntoViewIfNeeded();await page.screenshot({path:`/tmp/stockedby-current-value-${width}.png`});
  assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  await dialog.getByRole('button',{name:'Check holdings before saving'}).click();
  await dialog.getByLabel('I checked the matched listings, fund plans, units, currencies and costs against my original.').check();
  await dialog.getByRole('button',{name:'Add 3 holdings to my portfolios'}).click();await dialog.waitFor({state:'hidden'});
  assert.equal(state.document.positions[0].quantity,'3.5');assert.equal(state.document.positions[0].snapshotValue,'9000');assert.equal(state.document.positions[0].mapping,'confirmed');assert.equal(state.document.positions[2].mapping,'unresolved');
  await page.getByRole('button',{name:'US portfolio · USD',exact:true}).click();
  const nav=t=>page.getByRole('navigation',{name:'Investment desk'}).getByRole('button',{name:t,exact:true}).click();
  await nav('Portfolio');
  await page.getByText(/350.00/).filter({visible:true}).first().waitFor();
  await page.reload();await page.getByText(/350.00/).filter({visible:true}).first().waitFor();
  assert.equal(state.document.positions[0].snapshotValue,'9000');
  await page.getByRole('button',{name:'India portfolio · INR',exact:true}).click();
  await page.getByText('₹250.00',{exact:true}).filter({visible:true}).first().waitFor();
  await page.getByRole('button',{name:'Edit',exact:true}).filter({visible:true}).first().click();
  await dialog.getByLabel('Current value for Fictional India fund Direct Growth',{exact:true}).getByText('₹250.00',{exact:true}).waitFor();
  await dialog.getByLabel('Fund ticker / scheme code / ISIN',{exact:true}).fill('UNKNOWN');
  await dialog.getByText('Use “Find a ticker or fund scheme” to choose the exact Indian fund plan.',{exact:true}).waitFor();
  await dialog.getByText('Find a ticker or fund scheme',{exact:true}).click();
  await dialog.getByRole('button',{name:'Find matching listings',exact:true}).click();
  await dialog.getByRole('button',{name:/Fictional India fund Direct Growth INMF/}).click();
  assert.equal(await dialog.getByLabel('Fund ticker / scheme code / ISIN',{exact:true}).inputValue(),'123456');
  await dialog.getByLabel('I have confirmed this listing or fund plan and unit.').check();
  await dialog.getByLabel('Quantity (exact units)',{exact:true}).fill('20.125');
  await dialog.getByText('₹402.50',{exact:true}).waitFor();
  await dialog.getByRole('button',{name:'Save position',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await page.getByText('₹402.50',{exact:true}).filter({visible:true}).first().waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await context.close();console.log(`${width}px: screenshot extraction, quote matching, units × price, daily NAV, coverage gap, original snapshot, confirmation, regional values and reload passed`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}

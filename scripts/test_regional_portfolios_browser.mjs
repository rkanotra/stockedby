import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { normalizePosition, normalizeState, importPreview, instrumentId } from '../lib/terminal/domain.js';
import { FEED_COVERAGE } from '../lib/terminal/feeds.js';
import { trackingIdentity } from '../lib/terminal/holdingNews.js';
const base=process.env.TERMINAL_TEST_URL||'http://localhost:3004';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const errors=[];
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const now=new Date().toISOString();
  const positions=[
   {name:'Fictional US stock',symbol:'USCO',exchange:'NASDAQ',currency:'USD',assetClass:'equity'},
   {name:'Fictional Indian stock',symbol:'INCO',exchange:'NSE',currency:'INR',assetClass:'equity'},
   {name:'Fictional India fund Direct Growth',symbol:'123456',exchange:'INMF',currency:'INR',assetClass:'mutual_fund',snapshotValue:'1200'},
   {name:'Fictional US fund Investor',symbol:'FUNDX',exchange:'USMF',currency:'USD',assetClass:'mutual_fund'},
  ].map(p=>normalizePosition({quantity:'2',costBasis:'100',mapping:'confirmed',...p}));
  const research=market=>({market,kind:'brief',generatedAt:now,summary:`Fictional ${market} research only`,assessments:[],sources:[],gaps:[]});
  const state={document:{positions,watchlist:[],screens:[],settings:{currency:'AED'}},version:1,updatedAt:now,cache:Object.fromEntries(positions.filter(p=>p.assetClass==='equity').map(p=>[instrumentId(p),{quote:{currency:p.currency,price:p.currency==='INR'?200:100,asOf:now,quality:'live'}}])),runs:['US','India','All'].map(m=>({id:m,started_at:now,result:{market:m,research:[research(m)]}})),alerts:[],scheduled:false,schedulerConfigured:true,user:{email:'fictional@example.com',owner:true},feeds:FEED_COVERAGE};
  state.cache['portfolio-news']={identity:trackingIdentity(positions),lastCheckedAt:now,items:['US','India'].map((m,n)=>({url:`https://example.com/${m}`,title:`Fictional ${m} holdings update`,publishedAt:now,holdingImpacts:[{security:instrumentId(positions[n]),reason:'Fictional material change',mechanism:'Fictional mechanism'}]}))};
  let saves=0,lastRun;
  await context.route('**/api/terminal**',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:route.request().url().endsWith('/news')?{items:[]}:state});
   const body=route.request().postDataJSON();
   if(body.action==='save'){assert.equal(body.version,state.version);state.document=normalizeState(body.document);state.version++;saves++;return route.fulfill({json:{version:state.version}});}
   if(body.action==='import_preview')return route.fulfill({json:{preview:importPreview(body.csv,state.document.positions,{market:body.market}),version:state.version}});
   if(body.action==='import_commit'){assert.equal(body.market,'India');const ready=importPreview(body.csv,state.document.positions,{market:body.market}).filter(r=>r.status==='ready'&&body.rows.includes(r.row));state.document=normalizeState({...state.document,positions:[...state.document.positions,...ready.map(r=>r.position)]});state.version++;return route.fulfill({json:{version:state.version}});}
   if(body.kind){lastRun=body;return route.fulfill({json:{status:'complete'}});}
   return route.fulfill({json:{tracking:{message:'Fictional news check'}}});
  });
  const switchTo=async m=>page.getByRole('button',{name:`${m} portfolio · ${m==='US'?'USD':'INR'}`,exact:true}).click();
  const nav=tab=>page.getByRole('navigation',{name:'Investment desk'}).getByRole('button',{name:tab,exact:true}).click();
  await page.goto(base+'/terminal');
  await switchTo('US');
  assert.equal(await page.getByRole('button',{name:'US portfolio · USD'}).getAttribute('aria-pressed'),'true');
  await page.getByText('USD · native currency',{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Fictional India holdings update'}).count(),0);
  await nav('Portfolio');
  assert.equal(await page.getByText('Fictional Indian stock',{exact:true}).count(),0);
  assert.equal(await page.getByText('Fictional US stock',{exact:true}).filter({visible:true}).count(),1);
  await page.getByLabel('Filter asset type').selectOption('mutual_fund');
  assert.equal(await page.getByText('Fictional US stock',{exact:true}).count(),0);
  await switchTo('India');
  await page.getByText('INR · native currency',{exact:true}).waitFor();
  assert.equal(await page.getByText('Fictional US fund Investor',{exact:true}).count(),0);
  await page.getByRole('button',{name:'Add position',exact:true}).click();
  const dialog=page.getByRole('dialog');
  assert.equal(await dialog.getByLabel('Native currency',{exact:true}).inputValue(),'INR');
  await dialog.getByLabel('Company or fund name').fill('Fictional second Indian fund Direct Growth');
  await dialog.getByLabel('Asset type').selectOption('mutual_fund');
  assert.equal(await dialog.getByLabel('Exchange',{exact:true}).inputValue(),'INMF');
  await dialog.getByLabel('Fund ticker / scheme code / ISIN').fill('654321');
  await dialog.getByLabel('Quantity (exact units)').fill('12.123456789012345678');
  await dialog.getByRole('button',{name:'Save position',exact:true}).click();
  await dialog.waitFor({state:'hidden'});assert.equal(saves,1);assert.equal(state.document.positions.length,5);
  await page.reload();await page.getByText('INR · native currency',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'India portfolio · INR'}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Import portfolio',exact:true}).click();
  assert.equal(await dialog.getByLabel('Save into portfolio').inputValue(),'India');
  await dialog.getByRole('tab',{name:'CSV file',exact:true}).click();
  await dialog.getByLabel('CSV contents').fill('name,symbol,exchange,currency,assetClass,quantity\nFictional US import,WRONG,NASDAQ,USD,equity,1\nFictional India import,NEW,NSE,INR,equity,3');
  await dialog.getByRole('button',{name:'Check holdings before saving'}).click();
  await dialog.getByRole('cell',{name:/belongs to US, not the India portfolio/}).waitFor();
  await dialog.getByLabel('I checked the matched listings, fund plans, units, currencies and costs against my original.').check();
  await dialog.getByRole('button',{name:'Add 1 holding to my India portfolio',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  assert.equal(state.document.positions.length,6);assert.ok(!state.document.positions.some(p=>p.symbol==='WRONG'));
  await nav('Research');
  assert.equal(await page.getByLabel('Saved research').locator('option').count(),1);
  await page.getByText('Fictional India research only',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Market brief',exact:true}).click();
  await page.getByText('Scan complete.',{exact:true}).waitFor();assert.equal(lastRun.market,'India');
  await switchTo('US');await page.getByText('Fictional US research only',{exact:true}).waitFor();
  await nav('Overview');await page.getByText('US$200.00',{exact:true}).first().waitFor();
  assert.equal(await page.getByRole('heading',{name:'Fictional India holdings update'}).count(),0);
  await switchTo('India');await page.getByText('₹400.00',{exact:true}).first().waitFor();
  await page.getByText('Reported snapshots',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`/tmp/stockedby-portfolios-${width}.png`,fullPage:false});
  await page.getByRole('button',{name:'Switch to dark mode'}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.stockedbyTheme),'dark');
  await page.screenshot({path:`/tmp/stockedby-portfolios-dark-${width}.png`,fullPage:false});
  await context.close();console.log(`${width}px: regional holdings, fund add, import guard, native totals, scoped research/news, reload, themes passed`);
 }
 assert.deepEqual(errors,[]);
} finally {await browser.close();}

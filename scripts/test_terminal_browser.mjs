import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {normalizePosition,importPreview} from '../lib/terminal/domain.js';
import {FEED_COVERAGE} from '../lib/terminal/feeds.js';
const base=process.env.TERMINAL_TEST_URL||'http://localhost:3004';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const errors=[];
try {
 for(const width of [1440,375]){
  const context=await browser.newContext({viewport:{width,height:1000},colorScheme:'dark',reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const p=normalizePosition({name:'Fictional Corporation',symbol:'DEMO',exchange:'NASDAQ',currency:'USD',quantity:'3.123456789012345678',costBasis:'200',mapping:'confirmed'});
  const state={document:{positions:[p],watchlist:[],screens:[],settings:{currency:'USD'}},version:1,updatedAt:new Date().toISOString(),cache:{'NASDAQ:DEMO':{provider:'Fictional test fixture',currency:'USD',quote:{price:100,currency:'USD',asOf:new Date().toISOString(),quality:'live'},history:{adjustment:'split-adjusted',bars:Array.from({length:210},(_,i)=>({date:new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10),open:100+i,high:101+i,low:99+i,close:100+i,volume:100+i}))}}},runs:[],alerts:[],scheduled:false,user:{email:'fictional@example.com',owner:true},feeds:FEED_COVERAGE,schedulerConfigured:true};
  let writes=0,failNext=false;
  await context.route('**/api/terminal**',async route=>{
   if(route.request().method()==='GET')return route.fulfill({json:state});
   const body=route.request().postDataJSON();
   if(body.action==='save'){if(failNext){failNext=false;return route.fulfill({status:409,json:{error:'Version conflict. Reload before saving.'}})}assert.equal(body.version,state.version);state.document=body.document;state.version++;writes++;return route.fulfill({json:{version:state.version}});}
   if(body.action==='import_preview')return route.fulfill({json:{preview:importPreview(body.csv,state.document.positions),version:state.version}});
   if(body.action==='import_commit'){const rows=importPreview(body.csv,state.document.positions).filter(r=>r.status==='ready'&&body.rows.includes(r.row));state.document.positions.push(...rows.map(r=>r.position));state.version++;return route.fulfill({json:{version:state.version}})}
   return route.fulfill({json:{ok:true}});
  });
  await page.goto(base+'/terminal');await page.getByRole('heading',{name:'Your portfolio, at a glance.'}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal page overflow');
  await page.screenshot({path:`/tmp/stockedby-terminal-${width}.png`,fullPage:true});
  await page.getByRole('navigation',{name:'Investment desk'}).getByRole('button',{name:'Portfolio',exact:true}).click();
  await page.getByRole('button',{name:'Add position'}).click();
  await page.getByLabel('Company or instrument name').fill('Second fictional holding');await page.getByLabel('Ticker',{exact:true}).fill('TEST');await page.getByLabel('Exchange',{exact:true}).selectOption('NASDAQ');await page.getByLabel('Quantity (exact units)').fill('0.123456789012345678');
  await page.getByLabel('I have confirmed this listing and unit.').check();await page.getByRole('button',{name:'Save position',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(writes,1);await page.reload();await page.getByRole('navigation',{name:'Investment desk'}).getByRole('button',{name:'Portfolio',exact:true}).click();await page.getByText(/^0\.123456789012345678(?: shares)?$/).filter({visible:true}).first().waitFor();
  await page.getByRole('button',{name:'Import CSV',exact:true}).click();await page.getByLabel('Or paste CSV').fill('name,symbol,exchange,currency,quantity\nImport example,IMPORT,NASDAQ,USD,2\nImport example,IMPORT,NASDAQ,USD,2');await page.getByRole('button',{name:'Preview rows'}).click();await page.getByRole('cell',{name:/^duplicate/}).waitFor();await page.getByRole('button',{name:'Confirm import'}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(state.document.positions.length,3);
  await page.getByRole('button',{name:/DEMO Fictional Corporation/}).filter({visible:true}).click();await page.getByRole('heading',{name:'Fictional Corporation'}).waitFor();await page.getByRole('img',{name:/Daily history/}).focus();await page.keyboard.press('ArrowLeft');
  await page.getByRole('button',{name:'Settings and access'}).click();await page.getByRole('heading',{name:'Your account',exact:true}).waitFor();assert.ok(await page.getByRole('button',{name:'Sign out',exact:true}).isVisible());assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByRole('navigation',{name:'Investment desk'}).getByRole('button',{name:'Portfolio',exact:true}).click();await page.getByRole('button',{name:'Edit',exact:true}).first().click();failNext=true;await page.getByRole('button',{name:'Save position',exact:true}).click();await page.getByRole('alert').filter({hasText:'Version conflict'}).waitFor();assert.ok(await page.getByRole('dialog').isVisible());await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
  await page.goto(base+'/');await page.getByRole('heading',{level:1}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`/tmp/stockedby-home-${width}.png`,fullPage:true});
  await context.close();console.log(`Passed ${width}px: add/save/reload/import/dedup/chart/settings/conflict/modal/overflow`);
 }
 assert.deepEqual(errors,[]);console.log('No browser page errors. All data in this test is fictional.');
}finally{await browser.close();}

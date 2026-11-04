import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
const base=process.env.DASHBOARD_TEST_URL||'http://localhost:3004';
const live=process.env.DASHBOARD_LIVE==='1';
const quoteFixture=()=>({version:1,quotes:['SENSEX','XAG','NASDAQ','XAU','BTC','AEDINR'].map((id,i)=>({id,price:id==='AEDINR'?25.8:[76500,50,25000,4000,78000,2300][i],asOf:new Date(Date.now()-60000).toISOString()}))});
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const [width,height] of [[390,844],[844,390],[1440,1000]]){
  const context=await browser.newContext({...width<=844?devices['Pixel 7']:{},viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  // The dashboard must still work when every TradingView request is blocked.
  await context.route(/tradingview\.com|tradingview-widget\.com/,route=>route.abort());
  if(!live){
   await context.route('https://api.open-meteo.com/**',route=>route.fulfill({json:{timezone:'Asia/Dubai',current:{time:Math.floor(Date.now()/1000),temperature_2m:28,weather_code:0,is_day:1}}}));
   await context.route('**/api/market-news?view=dashboard',route=>route.fulfill({json:{fetchedAt:new Date().toISOString(),items:['India','UAE','US','Fintech'].map(market=>({title:`${market}: Fictional market update for layout verification: investors assess new company results, central bank commentary and global developments as financial markets respond to the latest economic figures`,url:`https://example.com/${market}`,publisher:'Reuters',market:market==='Fintech'?'Global':market,topic:market==='Fintech'?'Fintech':'News',publishedAt:new Date().toISOString()}))}}));
   await context.route('**/api/market-news?view=quotes',route=>route.fulfill({json:quoteFixture()}));
   await context.addInitScript(()=>{localStorage.setItem('stockedby-appearance','light');Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>({release:async()=>{},addEventListener:()=>{}})}});});
  }
  await page.goto(base+'/dashboard');
  await page.getByRole('heading',{name:'Your daily market dashboard'}).waitFor();
  await page.locator('[data-feed-state=ready]').first().waitFor({timeout:20000});
  await page.waitForTimeout(live?1000:300);
  assert.equal(await page.getByRole('article').count(),6);
  assert.equal(await page.locator('iframe').count(),0);
  assert.equal(await page.locator('[data-feed-state=ready]').count(),6);
  await page.getByRole('heading',{name:'Silver',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'US 500',exact:true}).count(),0);
  assert.equal(await page.getByRole('heading',{name:'Ethereum',exact:true}).count(),0);
  assert.equal(await page.getByRole('status').filter({hasText:'offline'}).count(),0);
  await page.waitForFunction(()=>/\d{2}:\d{2}/.test(document.querySelector('[aria-label="Current time"]')?.textContent||''));
  const clock=await page.getByLabel('Current time',{exact:true}).textContent();assert.match(clock,/\d{2}:\d{2}/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`/tmp/stockedby-dashboard-layout-${width}.png`,fullPage:true});
  console.log('Layout',width,height,await page.evaluate(()=>({scrollHeight:document.documentElement.scrollHeight,panels:[...document.querySelectorAll('main>section,footer')].map(e=>({label:e.getAttribute('aria-label'),height:e.getBoundingClientRect().height}))})));
  if(!live)assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),true);
  await page.screenshot({path:`/tmp/stockedby-dashboard-${live?'live':'mock'}-${width}.png`,fullPage:true});
  console.log('Size',width,height,'document',await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})), 'frames',page.frames().length);
  if(!live){
   await page.getByRole('button',{name:'UAE',exact:true}).click();assert.equal(await page.getByRole('link',{name:/UAE: Fictional/}).count(),1);
   assert.equal(await page.getByRole('link',{name:/India: Fictional/}).count(),0);
   await page.getByRole('button',{name:'USA',exact:true}).click();assert.equal(await page.getByRole('link',{name:/US: Fictional/}).count(),1);
   await page.getByRole('button',{name:'Fintech',exact:true}).click();assert.equal(await page.getByRole('link',{name:/Fintech: Fictional/}).count(),1);
   await page.getByRole('button',{name:'All',exact:true}).click();
   await page.getByLabel('Amount in AED',{exact:true}).fill('1000');assert.match(await page.getByLabel('Converted amount in INR',{exact:true}).textContent(),/25,800/);
   await page.getByLabel('Amount in AED',{exact:true}).fill('1');
   await page.getByRole('button',{name:'Keep awake',exact:true}).click();await page.getByRole('button',{name:'Screen stays on',exact:true}).waitFor();
   await page.getByRole('button',{name:'Pause headlines',exact:true}).click();await page.getByRole('button',{name:'Resume headlines',exact:true}).waitFor();
   await page.getByRole('button',{name:'Enter full screen',exact:true}).click();assert.equal(await page.evaluate(()=>!!document.fullscreenElement),true);
   await page.getByRole('button',{name:'Exit full screen',exact:true}).click();
   await page.getByRole('button',{name:'Display settings',exact:true}).click();await page.getByRole('dialog').waitFor();
   await page.getByRole('button',{name:'Switch to light mode',exact:true}).click();assert.equal(await page.locator('[data-theme]').getAttribute('data-theme'),'light');
   await page.getByLabel('Temperature',{exact:true}).selectOption('F');await page.getByLabel('Clock',{exact:true}).selectOption('12');
   await page.getByLabel('Weather & clock location',{exact:true}).selectOption('mumbai');
   await page.getByRole('button',{name:'Close display settings',exact:true}).click();
   await page.reload();await page.getByRole('button',{name:'Weather location: Mumbai. Change city',exact:true}).waitFor();
   await page.getByRole('button',{name:'Display settings',exact:true}).click();assert.equal(await page.getByLabel('Temperature',{exact:true}).inputValue(),'F');assert.equal(await page.getByLabel('Clock',{exact:true}).inputValue(),'12');
   await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
   await context.setOffline(true);await page.getByRole('status').filter({hasText:'offline'}).waitFor();await context.setOffline(false);
   await page.getByRole('status').filter({hasText:'offline'}).waitFor({state:'hidden'});
   assert.equal(await page.locator('[data-theme]').getAttribute('data-theme'),'light');
   const manifest=await page.request.get(base+'/dashboard.webmanifest');assert.equal(manifest.status(),200);assert.equal((await manifest.json()).start_url,'/dashboard');
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 if(!live){
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();let recover=false;
  await context.route(/tradingview\.com|tradingview-widget\.com/,route=>route.abort());
  await context.route('**/api/market-news?view=quotes',route=>recover?route.fulfill({json:quoteFixture()}):route.fulfill({status:503,json:{error:'Test outage'}}));
  await context.route('https://api.open-meteo.com/**',route=>route.abort());
  await context.route('**/api/market-news?view=dashboard',route=>route.fulfill({json:{items:[]}}));
  await page.goto(base+'/dashboard');
  await page.getByRole('button',{name:'Retry Sensex price',exact:true}).waitFor();
  assert.equal(await page.locator('[data-feed-state=unavailable]').count(),6);
  recover=true;await page.getByRole('button',{name:'Retry Sensex price',exact:true}).click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-feed-state=ready]').length===6);
  // Reload with a failed service: original public prices remain, explicitly old.
  recover=false;await page.reload();
  await page.waitForFunction(()=>document.querySelectorAll('[data-feed-state=stale]').length===6);
  assert.equal(await page.getByText('Saved value ·',{exact:false}).count(),5);
  assert.equal(await page.locator('iframe').count(),0);
  console.log('Native prices survive blocked widgets; failed requests retain dated values; retry recovers');
  await context.close();
 }
}finally{await browser.close();}

import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
const base=process.env.DASHBOARD_TEST_URL||'http://localhost:3004';
const live=process.env.DASHBOARD_LIVE==='1';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 for(const [width,height] of [[390,844],[844,390],[1440,1000]]){
  const context=await browser.newContext({...width<=844?devices['Pixel 7']:{},viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  if(!live){
   await context.route('https://api.open-meteo.com/**',route=>route.fulfill({json:{timezone:'Asia/Dubai',current:{time:Math.floor(Date.now()/1000),temperature_2m:28,weather_code:0,is_day:1}}}));
   await context.route('**/api/market-news?view=dashboard',route=>route.fulfill({json:{fetchedAt:new Date().toISOString(),items:[{title:'Fictional market update for layout verification: investors assess new company results, central bank commentary and global developments as financial markets respond to the latest economic figures',url:'https://example.com/news',publisher:'Reuters',market:'India',topic:'Markets',publishedAt:new Date().toISOString()}]}}));
   await context.route('https://www.tradingview-widget.com/**',route=>route.fulfill({contentType:'text/html',body:'<html><body style="color:#aaa;font:18px system-ui;background:transparent;margin:10px">Quote test fixture<br/><small>+1.20% · sample</small><script>parent.postMessage({name:\'tv-widget-ready\'},\'*\');</script></body></html>'}));
   await context.addInitScript(()=>{localStorage.setItem('stockedby-appearance','light');Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>({release:async()=>{},addEventListener:()=>{}})}});});
  }
  await page.goto(base+'/dashboard');
  await page.getByRole('heading',{name:'Your daily market dashboard'}).waitFor();
  await page.waitForTimeout(live?18000:1000);
  assert.equal(await page.getByRole('article').count(),6);
  if(!live)assert.equal(await page.locator('[data-feed-state=ready]').count(),6);
  assert.equal(await page.getByRole('status').filter({hasText:'offline'}).count(),0);
  await page.waitForFunction(()=>/\d{2}:\d{2}/.test(document.querySelector('[aria-label="Current time"]')?.textContent||''));
  const clock=await page.getByLabel('Current time',{exact:true}).textContent();assert.match(clock,/\d{2}:\d{2}/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  if(!live)assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),true);
  await page.screenshot({path:`/tmp/stockedby-dashboard-${live?'live':'mock'}-${width}.png`,fullPage:true});
  console.log('Size',width,height,'document',await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight})), 'frames',page.frames().length);
  if(!live){
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
  // A browser error document fires load, but cannot send a provider-ready event.
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();let recover=false;
  await context.route('https://www.tradingview-widget.com/**',route=>route.fulfill({contentType:'text/html',body:recover?'<script>parent.postMessage({name:"tv-widget-ready"},"*");</script>':'<html><body>Blocked test document</body></html>'}));
  await context.route('https://api.open-meteo.com/**',route=>route.abort());
  await context.route('**/api/market-news?view=dashboard',route=>route.fulfill({json:{items:[]}}));
  await page.goto(base+'/dashboard');
  await page.getByRole('button',{name:'Retry Sensex price',exact:true}).waitFor({timeout:30000});
  assert.equal(await page.locator('[data-feed-state=unavailable]').count(),6);
  assert.equal(await page.locator('[data-feed-state=ready]').count(),0);
  // A same-page message must not impersonate the provider/frame.
  await page.evaluate(()=>window.postMessage({name:'tv-widget-ready'},'*'));
  assert.equal(await page.locator('[data-feed-state=ready]').count(),0);
  recover=true;await page.getByRole('button',{name:'Retry Sensex price',exact:true}).click();
  await page.locator('article').first().locator('[data-feed-state=ready]').waitFor();
  console.log('Blocked-frame detection, origin check and retry recovery passed');
  await context.close();
 }
}finally{await browser.close();}

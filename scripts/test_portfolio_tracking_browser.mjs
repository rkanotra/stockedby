import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { trackingIdentity } from '../lib/terminal/holdingNews.js';
import { FEED_COVERAGE } from '../lib/terminal/feeds.js';
const base=process.env.TERMINAL_TEST_URL||'http://127.0.0.1:3007';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const errors=[];
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const now=new Date().toISOString();
  const positions=[{id:'one',name:'Fictional American Corp',symbol:'AMERICA',exchange:'NASDAQ',currency:'USD',assetClass:'equity',quantity:'2',mapping:'confirmed',account:'Fictional'},{id:'two',name:'Fictional Indian Ltd',symbol:'INDIA',exchange:'UNRESOLVED',currency:'INR',assetClass:'equity',quantity:'5',mapping:'unresolved',account:'Fictional'}];
  const impact=(security,reason)=>({security,relationship:'direct',direction:'mixed',reason,mechanism:'Demand may improve, but rising input costs could offset revenue gains.',watchFor:'Management commentary on margins in the next results.',uncertainty:'Guidance is an expectation and could change.'});
  const feed={identity:trackingIdentity(positions),lastCheckedAt:now,lastAnalysisAt:now,coverage:Object.fromEntries(['NASDAQ:AMERICA','INR:INDIA'].map(key=>[key,{checkedAt:now,headlines:[],error:null}])),items:[{url:'https://example.com/us-results',title:'Fictional American quarterly results',reportedFact:'The fictional issuer raised revenue guidance and reported higher costs.',publishedAt:now,holdingImpacts:[impact('NASDAQ:AMERICA','You hold the company reporting these results.')]},{url:'https://example.com/india-results',title:'Fictional Indian operating update',reportedFact:'The fictional issuer updated its demand forecast.',publishedAt:now,holdingImpacts:[impact('INR:INDIA','This company name matches your imported Indian holding.')]}],gaps:[]};
  const state={document:{positions,watchlist:[],settings:{currency:'USD'}},version:1,cache:{},runs:[],alerts:[],scheduled:true,schedulerConfigured:true,user:{email:'fictional@example.com'},feeds:FEED_COVERAGE};
  let tracks=0,gets=0,finish=false;
  await context.route('**/api/terminal**',async route=>{
   if(route.request().method()==='GET'){
    gets++;
    if(finish){state.cache['portfolio-news']=feed;state.cache['portfolio-tracking-job']={status:'complete',startedAt:now};}
    return route.fulfill({json:route.request().url().endsWith('/news')?{items:[]}:state});
   }
   const body=route.request().postDataJSON();
   if(body.action==='track'){
    tracks++;state.cache['portfolio-tracking-job']={status:'running',startedAt:now};
    return route.fulfill({json:{tracking:{status:'running',message:'Your news check has started.'}}});
   }
   if(body.action==='schedule'){state.scheduled=body.enabled;return route.fulfill({json:{ok:true}});}
   return route.fulfill({json:{ok:true}});
  });
  await page.goto(base+'/terminal');
  await page.getByText('You can leave this page. Results are saved online and appear here when ready.').waitFor();
  assert.equal(tracks,1);
  finish=true;
  await page.getByRole('heading',{name:/Fictional American quarterly results/}).waitFor({timeout:15000});
  assert.ok(gets>=3);assert.equal(tracks,1);
  await page.getByRole('button',{name:'All holding news'}).click();
  const panel=page.getByRole('region',{name:'News affecting your holdings'});
  await panel.getByRole('heading',{name:'What matters to your portfolio.',exact:true}).waitFor();
  assert.equal(await panel.getByText('How it could affect your holding',{exact:true}).count(),2);
  await panel.getByLabel('Holding',{exact:true}).selectOption('INR:INDIA');
  assert.equal(await panel.getByRole('heading',{name:'Fictional American quarterly results'}).count(),0);
  assert.equal(await panel.getByRole('heading',{name:'Fictional Indian operating update'}).count(),1);
  await panel.getByText('Listing not confirmed.',{exact:false}).waitFor();
  await panel.getByText('Coverage for each holding (1)',{exact:true}).click();
  await panel.getByText('No matching recent headlines returned by the selected sources.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await panel.getByLabel('Holding',{exact:true}).selectOption('');
  await panel.getByRole('heading',{name:'What matters to your portfolio.',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`/tmp/stockedby-holding-news-${width}.png`,fullPage:false});
  // The same saved results survive reload, without another AI request.
  await page.reload();await page.getByRole('heading',{name:/Fictional American quarterly results/}).waitFor();assert.equal(tracks,1);
  await page.getByRole('navigation',{name:'Investment desk'}).getByRole('button',{name:'Portfolio',exact:true}).click();
  await page.getByRole('button',{name:'News',exact:true}).filter({visible:true}).last().click();
  assert.equal(await page.getByLabel('Holding',{exact:true}).inputValue(),'INR:INDIA');
  await page.getByRole('button',{name:'Manage',exact:true}).click();
  await page.getByRole('button',{name:'Pause my scheduled scans',exact:true}).click();
  await page.getByRole('button',{name:'Enable my scheduled scans',exact:true}).waitFor();
  await page.getByRole('navigation',{name:'Investment desk'}).getByRole('button',{name:'News',exact:true}).click();
  await page.getByText('Automatic checks paused',{exact:true}).waitFor();
  await context.close();console.log(`Passed ${width}px: automatic start, background polling, saved results, impact explanations, filters, per-stock link, unconfirmed listings, pause and responsive layout.`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}

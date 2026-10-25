import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { teamDemo } from '../lib/team/demo.js';
import { prototypeArtifact } from '../lib/studio/prototype.js';
const base=process.env.STUDIO_TEST_URL||'http://localhost:3003';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const context=await browser.newContext({viewport:{width:1440,height:1100}}), page=await context.newPage(),team=teamDemo();
 page.setDefaultTimeout(20000); team.members.find(m=>m.user_id==='maya').role='owner';
 const errors=[]; page.on('pageerror',error=>errors.push(error.message));
 const row=team.projects[0],node=row.document.nodes.find(n=>n.type==='prototype');
 const raw=JSON.parse(await readFile(new URL('./fixtures/generated-mobile-prototype.json',import.meta.url),'utf8'));
 node.artifact={...prototypeArtifact(raw,{upstream:[],prototypeSettings:{platform:'mobile'}}),generatedAt:'2026-10-25T10:00:00Z',status:'draft'};
 row.document.name='Forma — fictional mobile QA';
 await context.route('**/api/team**',async route=>{
  if(new URL(route.request().url()).pathname==='/api/team/auth') return route.fulfill({json:{configured:true,user:{id:'maya',email:'maya@example.com'}}});
  assert.equal(route.request().method(),'GET');return route.fulfill({json:team});
 });
 await context.route('**/api/studio/generate',route=>{assert.equal(route.request().method(),'GET');return route.fulfill({json:{configured:true}});});
 await page.goto(`${base}/workspace#workspace=${row.workspace_id}&project=${row.id}&view=prototype&document=${node.id}`);
 await page.screenshot({path:'/tmp/stockedby-workbench-initial.png'});
 const frame=page.frameLocator('iframe[title="Forma interactive prototype"]');await frame.getByRole('heading',{name:'Book a meeting room'}).waitFor();
 assert.equal(await page.getByRole('combobox',{name:'Preview size'}).inputValue(),'mobile');
 await page.getByText('Journey map',{exact:false}).first().click();
 assert.ok(await page.getByText('Starting screen',{exact:true}).isVisible());
 await page.getByText('Journey map',{exact:false}).first().click();
 await frame.getByLabel('Room',{exact:true}).selectOption('Studio One');await frame.getByLabel('Date',{exact:true}).fill('2026-11-03');await frame.getByLabel('Guests',{exact:true}).fill('4');
 // Navigating with the workspace's screen controls must preserve the iframe's form state.
 await page.getByRole('button',{name:'02 Contact Details',exact:true}).click();
 await frame.getByLabel('Name',{exact:true}).waitFor();
 await page.getByRole('button',{name:'01 Choose Room',exact:true}).click();
 assert.equal(await frame.getByLabel('Room',{exact:true}).inputValue(),'Studio One');
 assert.equal(await frame.getByLabel('Guests',{exact:true}).inputValue(),'4');
 await page.screenshot({path:'/tmp/stockedby-mobile-workbench.png'});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download HTML',exact:false}).click();assert.ok((await download).suggestedFilename().endsWith('.html'));
 await page.setViewportSize({width:390,height:844});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await frame.getByRole('button',{name:'Continue',exact:true}).click();await frame.getByLabel('Name',{exact:true}).fill('Sam Example');await frame.getByLabel('Email',{exact:true}).fill('sam@example.com');await frame.getByRole('button',{name:'Review booking',exact:true}).click();
 try { await frame.getByRole('heading',{name:'Review your booking',exact:true}).waitFor(); } catch(error) { console.log(await frame.locator('body').innerText()); await page.screenshot({path:'/tmp/stockedby-workbench-failure.png'}); throw error; }
 assert.ok((await frame.locator('dd').allTextContents()).includes('Sam Example'));
 assert.deepEqual(errors,[]);
 console.log('PASS workspace integration: mobile device frame; actual journey graph; HTML download; narrow host viewport; iframe forms and bound summary.');
} finally {await browser.close();}

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { prototypeHtml } from '../lib/studio/prototypeRuntime.js';
import { prototypeArtifact } from '../lib/studio/prototype.js';
const raw=JSON.parse(await readFile(new URL('./fixtures/generated-mobile-prototype.json',import.meta.url),'utf8'));
const spec=prototypeArtifact(raw,{upstream:[],prototypeSettings:{platform:'mobile'}}).prototype;
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(prototypeHtml(spec));
 // Jumping directly to a review must not bypass its referenced required fields.
 await page.getByRole('button',{name:'All screens',exact:true}).click();await page.getByRole('navigation').getByRole('button',{name:'Review Booking',exact:true}).click();
 await page.getByRole('button',{name:'Confirm booking',exact:true}).click();await page.getByRole('heading',{name:'Book a meeting room',exact:true}).waitFor();
 await page.getByLabel('Room',{exact:true}).selectOption('Garden Room');await page.getByLabel('Date',{exact:true}).fill('2026-11-02');
 await page.getByLabel('Guests',{exact:true}).fill('10');await page.getByRole('button',{name:'Continue',exact:true}).click();await page.getByText('Enter 8 or less.').waitFor();
 await page.getByLabel('Guests',{exact:true}).fill('5');await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Jordan Taylor');await page.getByLabel('Email',{exact:true}).fill('jordan@example.com');await page.getByRole('button',{name:'Review booking',exact:true}).click();
 assert.deepEqual(await page.locator('dd').allTextContents(),['Garden Room','2026-11-02','5','Jordan Taylor','jordan@example.com']);
 await page.getByRole('button',{name:'Back',exact:true}).click();await page.getByLabel('Name',{exact:true}).fill('Jordan Lee');await page.getByRole('button',{name:'Review booking',exact:true}).click();
 await page.screenshot({path:'/tmp/stockedby-real-ai-mobile-review.png'});
 await page.evaluate(()=>window.postMessage({type:'stockedby-prototype-failure',enabled:true},'*'));await page.getByRole('button',{name:'Confirm booking',exact:true}).click();await page.getByRole('alert').waitFor();
 await page.evaluate(()=>window.postMessage({type:'stockedby-prototype-failure',enabled:false},'*'));await page.getByRole('button',{name:'Confirm booking',exact:true}).click();await page.getByRole('heading',{name:'Booking confirmed',exact:true}).waitFor();assert.ok((await page.locator('dd').allTextContents()).includes('Jordan Lee'));
 await page.screenshot({path:'/tmp/stockedby-real-ai-mobile-confirmation.png'});
 await page.getByRole('button',{name:'Start again',exact:true}).click();assert.equal(await page.getByLabel('Name',{exact:true}).count(),0);
 assert.equal(await page.getByLabel('Room',{exact:true}).inputValue(),'');
 for(const width of [320,375,390,430]) {await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 assert.deepEqual(errors,[]);console.log('PASS real AI output: required inputs, numeric boundary, actual values in review, name correction, failure/retry, confirmation, reset, small-device layout.');
} finally {await browser.close();}

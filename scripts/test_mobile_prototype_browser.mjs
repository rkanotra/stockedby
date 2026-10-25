import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { prototypeHtml } from '../lib/studio/prototypeRuntime.js';
import { mobilePrototype } from './fixtures/mobile-prototype.mjs';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}}), errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(prototypeHtml(mobilePrototype));
 assert.ok(await page.locator('body.compact').isVisible());
 assert.equal(await page.getByRole('button',{name:'All screens'}).count(),1);
 assert.equal(await page.getByRole('button',{name:'Choose a space',exact:true}).isVisible(),false);
 const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await overflow();
 const cta=page.getByRole('button',{name:'Continue',exact:true});
 const box=await cta.boundingBox(); assert.ok(box.y>730 && box.y+box.height<=844,'Primary action anchored within device');
 await cta.click(); await page.getByText('Please complete this field.').waitFor();
 await page.getByLabel('Day',{exact:true}).fill('2026-11-02');
 await page.getByLabel('How many people?',{exact:true}).fill('9'); await cta.click(); await page.getByText('Enter 8 or less.').waitFor();
 await page.getByLabel('How many people?',{exact:true}).fill('6'); await cta.click();
 await page.getByLabel('Full name',{exact:true}).fill('Alex Morgan'); await page.getByLabel('Email address',{exact:true}).fill('not-an-email');
 await page.getByRole('button',{name:'Review booking',exact:true}).click(); await page.getByText('Enter a valid email address.').waitFor();
 await page.getByLabel('Email address',{exact:true}).fill('alex@example.com');
 await page.getByRole('button',{name:'Go back',exact:true}).click();
 assert.equal(await page.getByLabel('How many people?',{exact:true}).inputValue(),'6');
 await page.screenshot({path:'/tmp/stockedby-mobile-booking.png'});
 await cta.click(); assert.equal(await page.getByLabel('Full name',{exact:true}).inputValue(),'Alex Morgan');
 await page.getByRole('button',{name:'Review booking',exact:true}).click();
 assert.equal(await page.locator('dd').allTextContents().then(x=>x.join('|')),'Garden Room|2026-11-02|6|Alex Morgan');
 await page.getByRole('checkbox').check();
 // The same trusted message path used by the inspector, from this standalone window's parent (itself).
 await page.evaluate(()=>window.postMessage({type:'stockedby-prototype-failure',enabled:true},'*'));
 await page.getByRole('button',{name:'Confirm booking',exact:true}).click(); await page.getByRole('alert').waitFor();
 assert.ok(await page.getByRole('checkbox').isChecked());
 await page.evaluate(()=>window.postMessage({type:'stockedby-prototype-failure',enabled:false},'*'));
 await page.getByRole('button',{name:'Confirm booking',exact:true}).click();
 await page.getByRole('heading',{name:'See you there.'}).waitFor();
 assert.ok((await page.locator('dd').allTextContents()).includes('Alex Morgan'));
 await page.screenshot({path:'/tmp/stockedby-mobile-confirmation.png'});
 await page.getByRole('button',{name:'Start again'}).click();
 assert.equal(await page.getByLabel('How many people?',{exact:true}).inputValue(),'2');
 assert.equal(await page.getByLabel('Day',{exact:true}).inputValue(),'');
 for(const width of [320,375,430,820,1280]) {await page.setViewportSize({width,height:844});await overflow();}
 await writeFile('/tmp/stockedby-mobile-prototype.html',prototypeHtml(mobilePrototype));
 assert.deepEqual(errors,[]);
 console.log('PASS: mobile navigation; anchored action; required/email/range validation; back retains entries; summary uses entered values; failure/retry retains values; reset clears simulation; no overflow 320–1280px; offline export.');
} finally {await browser.close();}

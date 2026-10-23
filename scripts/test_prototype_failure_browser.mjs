import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { prototypeHtml } from '../lib/studio/prototypeRuntime.js';
import { samplePrototype } from '../lib/studio/prototype.js';
const browser = await chromium.launch({headless:true,channel:'chrome'});
try {
 const page=await browser.newPage();
 const spec=samplePrototype();
 const screen=spec.screens.find(s=>s.sections.some(b=>b.type==='form'));
 const form=screen.sections.find(b=>b.type==='form');
 const submit=form.actions.find(a=>a.kind==='submit');
 await page.setContent(prototypeHtml(spec,{screenId:screen.id}));
 for(const f of form.fields) {
   const control=page.locator(`[name="${f.id}"]`);
   if(f.type==='checkbox') await control.check();
   else if(f.type==='select') await control.selectOption(f.options[0]);
   else await control.fill(f.type==='email'?'fictional@example.com':f.type==='number'?'3':f.type==='date'?'2026-10-23':'Fictional retained value');
 }
 const before=await page.locator('input,textarea,select').evaluateAll(xs=>xs.map(x=>[x.name,x.value,x.checked]));
 await page.evaluate(()=>window.postMessage({type:'stockedby-prototype-failure',enabled:true},'*'));
 await page.getByRole('main').getByRole('button',{name:submit.label,exact:true}).click();
 await page.getByRole('alert').filter({hasText:'Nothing was saved'}).waitFor();
 assert.deepEqual(await page.locator('input,textarea,select').evaluateAll(xs=>xs.map(x=>[x.name,x.value,x.checked])),before);
 await page.evaluate(()=>window.postMessage({type:'stockedby-prototype-failure',enabled:false},'*'));
 assert.deepEqual(await page.locator('input,textarea,select').evaluateAll(xs=>xs.map(x=>[x.name,x.value,x.checked])),before);
 await page.getByRole('main').getByRole('button',{name:submit.label,exact:true}).click();
 assert.equal(await page.getByRole('alert').count(),0);
 if(submit.targetScreenId) assert.equal(await page.locator('nav button[aria-current="page"]').innerText(),spec.screens.find(s=>s.id===submit.targetScreenId).name);
 console.log('PASS: failure simulation preserves form values and supports successful retry without resetting the preview.');
} finally {await browser.close();}

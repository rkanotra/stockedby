import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { prototypeHtml } from '../lib/studio/prototypeRuntime.js';
import { personalPrototype } from './fixtures/personal-prototype.mjs';
import { teamDemo } from '../lib/team/demo.js';
import { prototypeArtifact } from '../lib/studio/prototype.js';

const browser=await chromium.launch({headless:true,channel:'chrome'});
const base=process.env.STUDIO_TEST_URL;
const html=prototypeHtml(personalPrototype);
try {
  const context=await browser.newContext({viewport:{width:base?1440:390,height:base?1100:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  let app=page;
  if(base) {
    const team=teamDemo(),row=team.projects[0],node=row.document.nodes.find(n=>n.type==='prototype');
    team.members.find(m=>m.user_id==='maya').role='owner';
    node.artifact={...prototypeArtifact(personalPrototype,{upstream:[]}),generatedAt:'2026-10-25T12:00:00Z',status:'draft'};
    row.document.name='Personal application — fictional QA';
    await context.route('**/api/team**',route=>{
      assert.equal(route.request().method(),'GET','No real workspace writes');
      return route.fulfill({json:new URL(route.request().url()).pathname==='/api/team/auth'?{configured:true,user:{id:'maya',email:'maya@example.com'}}:team});
    });
    await context.route('**/api/studio/generate',route=>{assert.equal(route.request().method(),'GET','No AI generation');return route.fulfill({json:{configured:true}});});
    await page.goto(`${base}/workspace#workspace=${row.workspace_id}&project=${row.id}&view=prototype&document=${node.id}`);
    app=page.frameLocator('iframe[title="Sample application interactive prototype"]');
  } else await page.setContent(html);
  const button=name=>app.getByRole('button',{name,exact:true});
  const jump=async name=>{await button('All screens').click();await app.getByRole('navigation').getByRole('button',{name,exact:true}).click();};
  const current=app.locator('.currentRecord');
  const assertOwn=async(name,amount)=>{
    assert.equal(await current.count(),1,'Only one current application');
    assert.equal(await current.locator('strong').textContent(),name);
    assert.ok((await current.locator('dd').allTextContents()).includes(amount));
    assert.doesNotMatch(await app.locator('body').innerText(),/Other applicant|other\d+@example/);
  };
  await app.getByRole('heading',{name:'Your details',exact:true}).waitFor();
  assert.ok(await app.getByRole('heading',{name:'Sample personal loan',exact:true}).isVisible(),'Read-only catalogue preserved');
  await jump('Review your application');
  assert.equal(await current.count(),0);
  await app.getByText('Complete the form to see your details here.').waitFor();
  await app.getByLabel('These details are correct',{exact:true}).check();
  await button('Submit application').click();
  await app.getByRole('heading',{name:'Your details',exact:true}).waitFor();
  await app.getByLabel('Full name',{exact:true}).fill('Alex Example');
  await app.getByLabel('Application reference',{exact:true}).fill('DEMO-1042');
  await app.getByLabel('Email address',{exact:true}).fill('alex@example.com');
  await button('Continue').click();
  await app.getByLabel('Requested amount',{exact:true}).fill('1500');
  await app.getByLabel('Term',{exact:true}).selectOption('6 months');
  await button('Review application').click();
  await assertOwn('Alex Example','1500');
  assert.ok((await current.locator('dd').allTextContents()).includes('alex@example.com'));
  await button('Edit terms').click();
  await button('Edit your details').click();
  await app.getByLabel('Full name',{exact:true}).fill('Alex Example Updated');
  await button('Continue').click();
  assert.equal(await app.getByLabel('Requested amount',{exact:true}).inputValue(),'1500');
  await app.getByLabel('Requested amount',{exact:true}).fill('2000');
  await button('Review application').click();
  await assertOwn('Alex Example Updated','2000');
  await app.getByLabel('These details are correct',{exact:true}).check();
  const failure=async enabled=>{
    if(base) {
      // This is the real inspector's simulation control, never a real service call.
      await page.getByRole('checkbox',{name:'Simulate submission failure'}).setChecked(enabled);
    } else await page.evaluate(enabled=>window.postMessage({type:'stockedby-prototype-failure',enabled},'*'),enabled);
  };
  await failure(true);
  await button('Submit application').click();
  await app.getByRole('alert').waitFor();
  await assertOwn('Alex Example Updated','2000');
  assert.ok(await app.getByLabel('These details are correct',{exact:true}).isChecked());
  await failure(false);
  await button('Submit application').click();
  await app.getByRole('heading',{name:'Application submitted',exact:true}).waitFor();
  await assertOwn('Alex Example Updated','2000');
  // Repeating confirmation must not create another application.
  await jump('Review your application');await button('Submit application').click();
  await assertOwn('Alex Example Updated','2000');
  if(base) {
    const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download HTML',exact:false}).click();
    const path='/tmp/stockedby-personal-download.html';await(await download).saveAs(path);
    const exported=await context.newPage();await exported.goto(`file://${path}`);await exported.getByRole('button',{name:'All screens'}).click();await exported.getByRole('button',{name:'Review your application',exact:true}).click();
    assert.equal(await exported.locator('.currentRecord').count(),0);assert.doesNotMatch(await exported.locator('body').innerText(),/Alex Example|Other applicant/);await exported.close();
    await page.screenshot({path:'/tmp/stockedby-personal-workbench.png'});
  } else await page.screenshot({path:'/tmp/stockedby-personal-application.png',fullPage:true});
  await button('Start again').click();
  assert.equal(await app.getByLabel('Full name',{exact:true}).inputValue(),'');
  await jump('Review your application');assert.equal(await current.count(),0);
  assert.doesNotMatch(await app.locator('body').innerText(),/Alex Example|Other applicant/);
  const fresh=await browser.newContext({viewport:{width:390,height:844}}),other=await fresh.newPage();
  await other.setContent(prototypeHtml(personalPrototype,{screenId:'review'}));
  assert.equal(await other.locator('.currentRecord').count(),0);assert.doesNotMatch(await other.locator('body').innerText(),/Alex Example|Other applicant/);await fresh.close();
  // Newer generated flows use Continue before their first collection submit.
  const continued=structuredClone(personalPrototype);continued.screens[0].sections[1].actions[0].kind='continue';
  const draft=await context.newPage();await draft.setContent(prototypeHtml(continued));
  await draft.getByLabel('Full name',{exact:true}).fill('Taylor Example');await draft.getByLabel('Application reference',{exact:true}).fill('DEMO-2043');await draft.getByLabel('Email address',{exact:true}).fill('taylor@example.com');
  await draft.getByRole('button',{name:'Continue',exact:true}).click();await draft.getByLabel('Requested amount',{exact:true}).fill('3000');await draft.getByLabel('Term',{exact:true}).selectOption('12 months');await draft.getByRole('button',{name:'Review application',exact:true}).click();
  assert.equal(await draft.locator('.currentRecord').count(),1);assert.equal(await draft.locator('.currentRecord strong').textContent(),'Taylor Example');assert.ok((await draft.locator('.currentRecord dd').allTextContents()).includes('taylor@example.com'));await draft.close();
  const staff=await context.newPage();await staff.setContent(prototypeHtml({...personalPrototype,dataScope:'workspace'},{screenId:'review'}));
  assert.equal(await staff.locator('.tableCards .card').count(),20,'Explicit staff workspace keeps its fictional queue');await staff.close();
  await writeFile('/tmp/stockedby-personal-prototype.html',html);
  assert.deepEqual(errors,[]);
  console.log(`PASS ${base?'workspace':'offline'}: legacy personal default; 20 other sample applicants excluded; catalogue preserved; direct-jump validation; all steps update one application; edits; failure/retry; repeated confirmation; reset; fresh visitor; explicit staff queue.`);
} finally {await browser.close();}

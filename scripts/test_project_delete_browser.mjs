import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { teamDemo } from '../lib/team/demo.js';
const base=process.env.STUDIO_TEST_URL||'http://localhost:3003';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 for(const [role,available] of [['owner',true],['editor',true],['viewer',true],['owner',false]]) {
  const context=await browser.newContext({viewport:{width:1440,height:1000}}), page=await context.newPage(), team=teamDemo();
  team.members.find(m=>m.user_id==='maya').role=role; team.capabilities={deleteProjects:available};
  const original=team.projects[0];original.document.name='Same project name';
  const duplicate=structuredClone(original);duplicate.id='duplicate-project';duplicate.version=7;team.projects.push(duplicate);
  let requests=[],fail=true;
  await context.route('**/api/team**',async route=>{
   if(new URL(route.request().url()).pathname==='/api/team/auth') return route.fulfill({json:{configured:true,user:{id:'maya',email:'maya@example.com'}}});
   if(route.request().method()==='POST') {
    const body=route.request().postDataJSON();requests.push(body);
    assert.equal(body.action,'delete_project');assert.equal(body.projectId,duplicate.id);assert.equal(body.version,7);
    if(fail){fail=false;return route.fulfill({status:409,json:{error:'Version conflict: refresh before deleting.'}});}
    team.projects=team.projects.filter(p=>p.id!==duplicate.id);return route.fulfill({json:{result:{id:duplicate.id}}});
   }
   return route.fulfill({json:team});
  });
  await page.goto(base+'/workspace');await page.getByRole('heading',{name:'Your projects',exact:true}).waitFor();
  if(role!=='owner'||!available){assert.equal(await page.getByRole('button',{name:'Delete Same project name',exact:true}).count(),0);await context.close();continue;}
  const remove=page.getByRole('button',{name:'Delete Same project name',exact:true}).last();
  await remove.click();const modal=page.getByRole('dialog');await modal.waitFor();
  assert.ok(await modal.getByText(/Version 7/).isVisible());assert.equal(requests.length,0);
  assert.ok(await modal.getByRole('button',{name:'Keep project'}).evaluate(button=>button===document.activeElement));
  for(const [width,height] of [[1440,1000],[390,844],[320,568],[844,390]]) {
   await page.setViewportSize({width,height});
   const box=await modal.boundingBox();
   assert.ok(Math.abs(box.x+box.width/2-width/2)<2,'Dialog centered horizontally');
   assert.ok(Math.abs(box.y+box.height/2-height/2)<2,'Dialog centered vertically');
   assert.ok(box.x>=15 && box.y>=15 && box.x+box.width<=width-15 && box.y+box.height<=height-15,'Dialog stays inside viewport');
   await modal.getByRole('button',{name:'Keep project'}).scrollIntoViewIfNeeded();
   const buttons=await modal.getByRole('button',{name:'Keep project'}).boundingBox();
   assert.ok(buttons.y>=0 && buttons.y+buttons.height<=height,'Cancel remains reachable on short screens');
   if(width===390) await page.screenshot({path:'/tmp/stockedby-delete-mobile.png'});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'/tmp/stockedby-delete-centered.png'});
  await modal.getByRole('button',{name:'Keep project'}).click();assert.equal(requests.length,0);
  await remove.click();
  const download=page.waitForEvent('download');await modal.getByRole('button',{name:'Download project backup'}).click();assert.ok((await download).suggestedFilename().endsWith('-backup.json'));
  await modal.getByRole('button',{name:'Delete project',exact:true}).click();await modal.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('button',{name:'Delete Same project name',exact:true}).count(),2);
  await page.screenshot({path:'/tmp/stockedby-delete-confirmation.png'});
  await modal.getByRole('button',{name:'Delete project',exact:true}).click();await modal.waitFor({state:'hidden'});
  assert.equal(await page.getByRole('button',{name:'Delete Same project name',exact:true}).count(),1);
  await page.reload();await page.getByRole('heading',{name:'Your projects',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Delete Same project name',exact:true}).count(),1);
  await page.screenshot({path:'/tmp/stockedby-project-delete-card.png'});
  await context.close();
 }
 console.log('PASS: centered desktop/mobile/short-screen dialog; initial focus on Keep project; owner-only controls; explicit confirmation; cancel sends no request; backup; failure keeps card; duplicate-name ID/version targeting; success removes only chosen project; refresh stays deleted. Mocked data only.');
} finally {await browser.close();}

import test from 'node:test';
import assert from 'node:assert/strict';
import { preparePrototypeData } from './prototype-data.js';
import { prototypeHtml, screenSvg } from './prototypeRuntime.js';
import { validatePrototype } from './prototype.js';
import { applyPrototypeSettings, validatePrototypeSettings } from './prototype-settings.js';
import { personalPrototype } from '../../scripts/fixtures/personal-prototype.mjs';

test('personal and legacy application exports omit other applicants but retain product catalogues',()=>{
  const original=JSON.stringify(personalPrototype);
  const prepared=preparePrototypeData(personalPrototype);
  assert.equal(prepared.dataScope,'personal');
  assert.deepEqual(prepared.personalCollections.sort(),['acknowledgements','applications']);
  assert.equal(prepared.screens[0].sections[0].records.length,1);
  assert.equal(prepared.screens[2].sections[0].records.length,0);
  assert.equal(prepared.screens[3].sections[0].records.length,0);
  for(const output of [prototypeHtml(personalPrototype),screenSvg(personalPrototype,'review')]) {
    assert.doesNotMatch(output,/Other applicant|other\d+@example/);
  }
  assert.equal(JSON.stringify(personalPrototype),original,'stored source is not changed');
});
test('staff queues require explicit scope; human choice overrides model scope',()=>{
  const spec=applyPrototypeSettings(personalPrototype,{platform:'web',dataScope:'workspace'});
  assert.equal(preparePrototypeData(spec).screens[2].sections[0].records.length,20);
  assert.match(prototypeHtml(spec),/Other applicant 20/);
  assert.equal(applyPrototypeSettings(spec,{platform:'mobile'}).dataScope,'personal');
  assert.throws(()=>validatePrototypeSettings({platform:'mobile',dataScope:'everyone'}),/personal journey/);
  assert.throws(()=>validatePrototype({...spec,dataScope:'everyone'}),/invalid/);
});
test('bound summary definitions survive personal record stripping',()=>{
  const spec=structuredClone(personalPrototype);
  spec.screens[2].sections.push({id:'summary',type:'summary',title:'Entered name',description:'',collection:'applications',visibility:'always',fields:[],actions:[],records:[{id:'name',title:'Full name',subtitle:'',status:'',value:'',fieldRef:'start.identity.title'}]});
  assert.equal(preparePrototypeData(spec).screens[2].sections[2].records[0].fieldRef,'start.identity.title');
});

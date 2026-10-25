import test from 'node:test';
import assert from 'node:assert/strict';
import { prototypeJourney } from './prototype-journey.js';
import { validatePrototype } from './prototype.js';
import { mobilePrototype } from '../../scripts/fixtures/mobile-prototype.mjs';
test('journey uses real forward/back branches and detects menu-only screens',()=>{
 const spec=structuredClone(mobilePrototype);
 const map=prototypeJourney(spec);
 assert.ok(map.every(s=>s.reachable));
 assert.equal(map[0].edges[0].target,'contact');
 spec.screens[0].sections[1].actions=[];
 assert.equal(prototypeJourney(spec).find(s=>s.id==='contact').reachable,false);
});
test('multi-step summaries and explicit numeric limits validate; broken references fail',()=>{
 assert.doesNotThrow(()=>validatePrototype(structuredClone(mobilePrototype)));
 const bad=structuredClone(mobilePrototype);bad.screens[2].sections[0].records[0].fieldRef='not.a.field';
 assert.throws(()=>validatePrototype(bad),/missing form field/);
 const bounds=structuredClone(mobilePrototype);bounds.screens[0].sections[1].fields[2].max='0';
 assert.throws(()=>validatePrototype(bounds),/Invalid prototype field/);
 const action=structuredClone(mobilePrototype);action.screens[0].actions=[action.screens[0].sections[1].actions[0]];
 assert.throws(()=>validatePrototype(action),/must belong to a form/);
});

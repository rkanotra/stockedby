import test from 'node:test';
import assert from 'node:assert/strict';
import { prototypeLimitations, prototypeArtifact, samplePrototype } from './prototype.js';
test('flags unbound form updates and row navigation without claiming these are implemented',()=>{
 const p=samplePrototype();const screen=p.screens[0];
 screen.sections.push({type:'form',actions:[{kind:'update',label:'Update request',collection:'requests',recordId:''}]});
 screen.sections.push({type:'table',records:[],actions:[{kind:'navigate',label:'View details',collection:'requests'}]});
 const gaps=prototypeLimitations(p);
 assert.ok(gaps.some(g=>g.includes('no selected record')));
 assert.ok(gaps.some(g=>g.includes('cannot save or validate form values')));
 assert.ok(gaps.some(g=>g.includes('does not pass the selected record')));
 assert.ok(gaps.some(g=>g.includes('row buttons cannot appear')));
});
test('supported row actions and creation flows do not produce false capability warnings',()=>{
 const p=samplePrototype();assert.deepEqual(prototypeLimitations(p),[]);
 assert.deepEqual(prototypeArtifact(p,{upstream:[]}).findings,[]);
});

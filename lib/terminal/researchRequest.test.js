import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDossier } from './researchRequest.js';

const now=Date.parse('2026-11-09T12:00:00Z'), key='dossier:NSE:LT';
const input={kind:'dossier',security:'NSE:LT',mode:'review',thesis:'Growth with cash',horizon:'3–5 years'};
const previous={reports:[{id:'old'}]};
const fresh={thesis:input.thesis,horizon:input.horizon,reports:[{id:'new',thesis:input.thesis,horizon:input.horizon,createdAt:new Date(now+60000).toISOString()}]};
test('a dropped response recovers only the matching new saved review without another paid request',async()=>{
  let calls=0;
  const result=await requestDossier({api:async()=>{calls++;throw new TypeError('Failed to fetch');},reload:async()=>({cache:{[key]:fresh}}),key,input,previous,now});
  assert.equal(result.recovered,true);assert.equal(calls,1);assert.equal(result.dossier.reports[0].id,'new');
});
test('old or concurrent different-thesis reviews never become false success after a disconnect',async()=>{
  for(const saved of [previous,{...fresh,reports:[{...fresh.reports[0],thesis:'Another thesis'}]},{...fresh,reports:[{...fresh.reports[0],createdAt:new Date(now-60000).toISOString()}]}]) {
    await assert.rejects(()=>requestDossier({api:async()=>{throw new TypeError('Failed to fetch');},reload:async()=>({cache:{[key]:saved}}),key,input,previous,now,attempts:2,pause:async()=>{}}),/Reload and check History/);
  }
});
test('a review that finishes after disconnect is recovered by read-only polling, with no AI rerun',async()=>{
  let requests=0,reads=0,pauses=0,recoveries=0;
  const result=await requestDossier({api:async()=>{requests++;throw new TypeError('Failed to fetch');},reload:async()=>({cache:{[key]:++reads<3?previous:fresh}}),key,input,previous,now,attempts:4,pause:async()=>{pauses++;},onRecover:()=>{recoveries++;}});
  assert.equal(result.recovered,true);assert.equal(requests,1);assert.equal(reads,3);assert.equal(pauses,2);assert.equal(recoveries,1);
});
test('server validation errors retain their explanation and do not pretend a previous report is success',async()=>{
  let loads=0;
  await assert.rejects(()=>requestDossier({api:async()=>{throw Object.assign(Error('Invalid source amount'),{status:502});},reload:async()=>{loads++;},key,input,previous,now}),/Invalid source amount/);
  assert.equal(loads,0);
});

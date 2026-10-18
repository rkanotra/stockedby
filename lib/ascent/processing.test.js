import test from 'node:test';
import assert from 'node:assert/strict';
import { processSession } from './processing.js';
const valid={overallScore:6,dimensions:['clarity','evidence','ownership','decision'].map(key=>({key,score:6,evidence:'Names two dependencies.',nextAction:'State the consequence.'})),strengths:['Identifies dependencies.'],priorities:['State the fallback.'],improvedResponse:'I need the vendor estimate and test plan before confirming the date.',followUpChallenge:'What changes if either input is late?',coachingNote:'',limitations:[],publication:{title:'',summary:'',caption:''}};
test('a follow-up with optional empty coaching note reaches ready and keeps the saved answer',async()=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='test-only';
 const claimed={id:'78962ea0-6966-4a43-b610-796a570bdff7',lease_token:'lease',kind:'scenario',attempts:2,prompt:'Which inputs are missing?',answer:'I need the vendor estimate and the testing plan.',context:{},target_seconds:90};
 const jobs=[];
 const db={rpc:async(name,{action,args})=>{assert.equal(name,'ascent_action');assert.equal(action,'job');jobs.push(args);return {data:{...claimed,...args},error:null};}};
 try {
  globalThis.fetch=async()=>new Response(JSON.stringify({object:'response',status:'completed',model:'test-model',usage:{input_tokens:20,output_tokens:40},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(valid)}]}]}),{headers:{'Content-Type':'application/json'}});
  await processSession(db,claimed);
  assert.deepEqual(jobs.map(x=>x.status),['reviewing','ready']);
  assert.equal(jobs[1].review.followUpChallenge,valid.followUpChallenge);
  assert.equal(jobs[1].review.coachingNote,'');
  assert.equal(claimed.answer,'I need the vendor estimate and the testing plan.');
  assert.equal(jobs[1].token,'lease');
 } finally {globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
});

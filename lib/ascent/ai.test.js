import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewAnswer } from './ai.js';
const item = {kind:'scenario',prompt:'Fictional deadline exercise',audience:'CBO',target_seconds:90,context:{replyMode:'email'}};
const review = {overallScore:7,dimensions:['clarity','accountability','evidence','boundaries'].map(key=>({key,score:7,evidence:'A deadline is stated.',nextAction:'Name the decision owner.'})),strengths:['A clear checkpoint.'],priorities:['Specify the owner.'],improvedResponse:'I will return tomorrow with validated options.',followUpChallenge:'What if the dependency slips?',coachingNote:'Lead with the decision.',limitations:[],publication:{title:'',summary:'',caption:''}};
test('coaching validates real Responses API contracts and handles provider failures without retries',async t=>{
 const oldFetch=globalThis.fetch,oldKey=process.env.OPENAI_API_KEY;
 process.env.OPENAI_API_KEY='test-placeholder-not-a-real-key';
 try {
  let payload,body={object:'response',status:'completed',model:'test-model',usage:{input_tokens:100,output_tokens:200},output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(review)}]}]};
  globalThis.fetch=async(_url,options)=>{payload=JSON.parse(options.body);return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});};
  await t.test('valid report enforces text-only claims and structured integer scores',async()=>{
   const result=await reviewAnswer(item,'A fictional response with a concrete decision checkpoint.');
   assert.deepEqual(result.review.assessedModalities,['text']);
   assert.match(result.review.limitations.at(-1),/were not assessed/);
   assert.equal(result.usage.outputTokens,200);
   assert.equal(payload.store,false);
   assert.equal(payload.text.format.schema.properties.dimensions.maxItems,6);
   assert.deepEqual(payload.text.format.schema.properties.overallScore.type,['integer','null']);
  });
  await t.test('incomplete output stays retryable rather than becoming a saved score',async()=>{
   body={...body,status:'incomplete'};
   await assert.rejects(reviewAnswer(item,'A fictional response long enough to review.'),/incomplete/);
  });
  await t.test('malformed provider output is rejected',async()=>{
   body={...body,status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify({...review,overallScore:7.5})}]}]};
   await assert.rejects(reviewAnswer(item,'A fictional response long enough to review.'),/format was incomplete/);
  });
  await t.test('rate limiting produces one request and preserves the provider status',async()=>{
   let calls=0;
   globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify({error:{message:'Rate limited',type:'rate_limit_error'}}),{status:429,headers:{'Content-Type':'application/json'}});};
   await assert.rejects(reviewAnswer(item,'A fictional response long enough to review.'),e=>e.status===429);
   assert.equal(calls,1);
  });
 } finally {
  globalThis.fetch=oldFetch;
  if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;
 }
});

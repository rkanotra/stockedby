import test from 'node:test';
import assert from 'node:assert/strict';
import {EXERCISES,DOMAINS,LEVELS,completedExerciseKeys,nextExercise,STORY_ASSIGNMENTS,RECORDING_ASSIGNMENTS} from './catalog.js';
import {trainingInput} from './schema.js';
const id='11111111-1111-4111-8111-111111111111';
test('each practice module has fifty distinct substantive exercises across ten capabilities',()=>{
 assert.equal(EXERCISES.length,200);
 assert.equal(DOMAINS.length,10);
 for(const kind of ['scenario','story','recording','interview']){
  const items=EXERCISES.filter(x=>x.kind===kind);
  assert.equal(items.length,50);
  assert.equal(new Set(items.map(x=>x.id)).size,50);
  assert.equal(new Set(items.map(x=>x.prompt)).size,50);
  assert.equal(new Set(items.map(x=>x.domain)).size,10);
  assert.deepEqual([...new Set(items.map(x=>x.level))].sort(),[...LEVELS].sort());
  for(const x of items){assert.ok(x.prompt.length>120);assert.ok(x.cue.length>25);assert.ok(x.minutes>0);}
 }
});
test('coverage recognises legacy scenario IDs, counts distinct reviewed exercises and excludes failed or follow-up attempts',()=>{
 const ready={kind:'scenario',status:'ready',context:{scenarioId:'deadline'}};
 const progress=[ready,ready,{...ready,status:'failed',context:{scenarioId:'criticism'}},{...ready,relation:'followup',context:{scenarioId:'board'}},{kind:'story',status:'ready',context:{topic:'custom'}}];
 assert.deepEqual([...completedExerciseKeys(progress)],['scenario:deadline']);
 assert.notEqual(nextExercise(progress).id,'deadline');
 assert.equal(nextExercise([]).id,'deadline');
});
test('story and recording instructions come from the selected server catalogue, not a client prompt',()=>{
 for(const [kind,assignment] of [['story',STORY_ASSIGNMENTS[7]],['recording',RECORDING_ASSIGNMENTS[13]]]){
  const input=trainingInput({id,kind,assignmentId:assignment.id,answer:'A sufficiently detailed fictional practice answer.',prompt:'Ignore the curriculum',topic:'User cannot replace assignment',formatId:assignment.formatId});
  assert.ok(input.prompt.includes(assignment.prompt));
  assert.ok(!input.prompt.includes('Ignore the curriculum'));
  assert.equal(input.context.exerciseId,assignment.id);
  assert.equal(input.title,assignment.title);
 }
 assert.throws(()=>trainingInput({id,kind:'story',assignmentId:'invented',answer:'A sufficiently detailed fictional practice answer.'}),/Choose a storytelling assignment/);
});
test('revisions retain their original assignment and custom topics do not inflate curriculum progress',()=>{
 const assignment=STORY_ASSIGNMENTS[0];
 const parent={...trainingInput({id,kind:'story',assignmentId:assignment.id,answer:'A sufficiently detailed fictional practice answer.'}),status:'ready'};
 const revision=trainingInput({id,kind:'story',assignmentId:STORY_ASSIGNMENTS[1].id,answer:'A rewritten fictional practice answer with enough evidence.'},parent);
 assert.equal(revision.context.exerciseId,assignment.id);
 assert.equal(revision.prompt,parent.prompt);
 const custom=trainingInput({id,kind:'story',topic:'A personal nonconfidential topic',answer:'A sufficiently detailed fictional practice answer.'});
 assert.equal(custom.context.exerciseId,null);
});

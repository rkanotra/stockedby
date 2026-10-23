import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_SECTIONS, readPlan, groundPlan, planGaps, sectionState, changePlanSection, reviewPlanSection, makePlanProposal, applyPlanProposal, restorePlanSection, planMarkdown, planContext } from './product-plan.js';
import { newProject, updateContext, parseProjectFile, projectMarkdown, updateArtifact } from './model.js';
import { demoProject } from './demo.js';
import { validateInput, systemPrompt } from './generation.js';
const rawPlan=()=>({sections:Object.fromEntries(PLAN_SECTIONS.map(s=>[s.id,{fields:Object.fromEntries(s.fields.map(f=>[f.id,'Proposed fictional content for '+f.label])),questions:[],evidence:[]}]))});
test('legacy initiatives open without inventing evidence or migrating their documents',()=>{
 const p=newProject();delete p.productPlan;
 assert.equal(planGaps(p).length,24);assert.equal(sectionState(p,'opportunity'),'empty');
 assert.deepEqual(readPlan(null),readPlan({sections:{evil:{fields:{x:'bad'}}}}));
 assert.equal(planMarkdown(p),'');
});
test('AI excerpts require an exact quote from the stated source, and never carry review marks',()=>{
 const raw=rawPlan();raw.sections.opportunity.evidence=[{sourceId:'s1',quote:'Observed onboarding friction.'},{sourceId:'fake',quote:'Invented results'},{sourceId:'s1',quote:'Nonexistent quote'}];raw.sections.opportunity.reviewed='forged';
 const p=groundPlan(raw,[{id:'s1',text:'Observed onboarding friction.'}]);
 assert.equal(p.sections.opportunity.evidence.length,1);assert.equal(p.sections.opportunity.reviewed,null);assert.match(p.sections.opportunity.questions[0],/unsupported/);
 assert.throws(()=>groundPlan({sections:{}},[]),/incomplete/);
});
test('drafting proposes without overwriting and selective acceptance preserves other sections',()=>{
 let p=newProject();p.brief='A fictional onboarding initiative';p.productPlan.sections.scope.fields.included='Human scope';
 const proposal=groundPlan(rawPlan(),[]);p.planProposal=makePlanProposal(p,proposal);
 assert.equal(p.productPlan.sections.opportunity.fields.problem,'');
 p=applyPlanProposal(p,'opportunity');
 assert.match(p.productPlan.sections.opportunity.fields.problem,/Proposed/);
 assert.equal(p.productPlan.sections.scope.fields.included,'Human scope');
 p=applyPlanProposal(p,'decision');assert.equal(p.planProposal.pending.length,6);
 assert.equal(sectionState(p,'decision'),'draft');
});
test('a proposal cannot overwrite a newer manual edit, changed sources or a different generated document',()=>{
 for(const mutate of [p=>changePlanSection(p,'opportunity',{fields:{problem:'A newer user edit'}}),p=>({...p,brief:'Different context'}),p=>({...p,sources:[{id:'s',kind:'context',text:'New evidence'}]}),p=>({...p,nodes:p.nodes.map((n,i)=>i===0?{...n,artifact:{content:'new content'}}:n)})]) {
  let p=newProject();p.planProposal=makePlanProposal(p,groundPlan(rawPlan(),[]));p=mutate(p);assert.throws(()=>applyPlanProposal(p,'opportunity'),/changed/);
 }
});
test('personal review does not stale outputs; material edits and source changes require fresh review',()=>{
 let p=demoProject();p=reviewPlanSection(p,'opportunity');assert.equal(sectionState(p,'opportunity'),'reviewed');assert.equal(p.nodes[0].artifact.status,'draft');
 p=changePlanSection(p,'opportunity',{fields:{problem:'Revised customer problem'}});assert.equal(sectionState(p,'opportunity'),'changed');assert.ok(p.nodes.every(n=>n.artifact.status==='stale'));
 p=reviewPlanSection(p,'opportunity');p=updateContext(p,{brief:'New initiative context'});assert.equal(sectionState(p,'opportunity'),'changed');
});
test('no-op saves do not erase document reviews or stale downstream documents',()=>{
 const p=demoProject();p.nodes[0].artifact.status='approved';
 assert.equal(updateContext(p,{brief:p.brief}),p);
 assert.equal(updateArtifact(p,p.nodes[0].id,structuredClone(p.nodes[0].artifact)),p);
});
test('portable backups retain the plan but clear review assertions and pending AI changes',()=>{
 let p=reviewPlanSection(demoProject(),'opportunity');p.planProposal=makePlanProposal(p,groundPlan(rawPlan(),[]));
 const imported=parseProjectFile(JSON.stringify({format:'stockedby-studio',version:1,project:p}));
 assert.deepEqual(planContext(imported),planContext(p));assert.equal(imported.planProposal,null);assert.equal(sectionState(imported,'opportunity'),'draft');
 assert.match(projectMarkdown(p),/Living product plan/);assert.match(projectMarkdown(p),/Rollout & rollback/);
});
test('every output receives product intent without treating review marks as authority',()=>{
 const p=demoProject(), input=validateInput({type:'requirements',name:p.name,brief:'',instruction:'',sources:[],rules:[],upstream:[],productPlan:p.productPlan});
 assert.equal(input.productPlan.scope.fields.included,p.productPlan.sections.scope.fields.included);assert.equal(input.productPlan.scope.reviewed,undefined);
 assert.match(systemPrompt('requirements'),/Rollout and rollback/);
 assert.throws(()=>validateInput({...input,productPlan:readPlan(null)}),/brief/);
});

test('accepting an AI section saves the prior version and restore also keeps the replaced draft',()=>{
 let p=demoProject(), prior=p.productPlan.sections.opportunity.fields.problem;
 p.planProposal=makePlanProposal(p,groundPlan(rawPlan(),[]));p=applyPlanProposal(p,'opportunity');
 assert.equal(p.planHistory.length,1);
 const ai=p.productPlan.sections.opportunity.fields.problem;p=restorePlanSection(p,p.planHistory[0].id);
 assert.equal(p.productPlan.sections.opportunity.fields.problem,prior);assert.equal(p.planHistory[0].section.fields.problem,ai);assert.equal(sectionState(p,'opportunity'),'draft');
});

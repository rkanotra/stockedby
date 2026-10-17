// Optional live smoke test: fictional content only; consumes one OpenAI request.
// Run: node --env-file=.env.local scripts/test_team_ai.mjs
import OpenAI from 'openai';
import { teamDemo } from '../lib/team/demo.js';
import { CHANGE_SCHEMA, CHANGE_PROMPT, changeTargets, validateProposal } from '../lib/team/changes.js';
const document=teamDemo().projects[0].document;
const result=await new OpenAI({timeout:55000,maxRetries:0}).responses.create({
  model:process.env.STUDIO_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1',store:false,max_output_tokens:8500,
  instructions:CHANGE_PROMPT,
  input:JSON.stringify({changeRequest:'Clarify that administrators see an actionable delivery-failure message and can retry without re-entering the invitation email. Only clarify existing requirements and acceptance criteria; preserve expiry, roles, email provider and release scope.',targets:changeTargets(document),sources:document.sources,confirmedRules:document.rules.filter(r=>r.approved),decisions:[]}),
  text:{format:{type:'json_schema',name:'initiative_change_review',strict:true,schema:CHANGE_SCHEMA}},
});
if(result.status!=='completed')throw Error('AI did not complete');
const proposal=validateProposal(JSON.parse(result.output_text),document);
console.log(JSON.stringify({status:result.status,patches:proposal.patches.length,questions:proposal.questions.length,risks:proposal.risks.length,source:'fictional Orbit sample'}));
if(!proposal.patches.length)throw Error('Expected at least one focused edit');

// Explicit live QA tool: fictional input only. Uses the configured OpenAI model.
import OpenAI from 'openai';
import { writeFile } from 'node:fs/promises';
import { PROTOTYPE_SCHEMA, PROTOTYPE_PROMPT, validatePrototype, prototypeArtifact } from '../lib/studio/prototype.js';
import { PROTOTYPE_SETTINGS_PROMPT, PROTOTYPE_JOURNEY_PROMPT } from '../lib/studio/prototype-settings.js';
import { prototypeHtml } from '../lib/studio/prototypeRuntime.js';
process.loadEnvFile('.env.local');
const input={name:'Forma',brief:'Fictional QA project: mobile meeting room booking. Available sample rooms: Garden Room and Studio One. Ask for room, date, guests (1 to 8 inclusive), name and email. Review actual entered values and confirm a simulated booking. Preserve entries on Back. No live availability, payment, login, email or admin dashboard. No invented prices or policies.',instruction:'Compact, elegant mobile journey in emerald. Group related fields.',upstream:[],sources:[],rules:[],prototypeSettings:{platform:'mobile',audience:'People booking a meeting room',journey:'Choose room/date/guests, add contact details, review and confirm.'}};
const client=new OpenAI({maxRetries:0});
const response=await client.responses.create({model:process.env.STUDIO_OPENAI_MODEL||process.env.OPENAI_MODEL||'gpt-4.1',store:false,max_output_tokens:7000,instructions:[PROTOTYPE_PROMPT,PROTOTYPE_SETTINGS_PROMPT,PROTOTYPE_JOURNEY_PROMPT].join('\n'),input:JSON.stringify(input),text:{format:{type:'json_schema',name:'delivery_artifact',strict:true,schema:PROTOTYPE_SCHEMA}}});
const raw=JSON.parse(response.output_text);
await writeFile('/tmp/stockedby-live-mobile-raw.json',JSON.stringify(raw,null,2));
const artifact=prototypeArtifact(validatePrototype(raw),input);
await writeFile('/tmp/stockedby-live-mobile-result.json',JSON.stringify({artifact,model:response.model,usage:response.usage},null,2));
await writeFile('/tmp/stockedby-live-mobile.html',prototypeHtml(artifact.prototype));
console.log(JSON.stringify({model:response.model,usage:response.usage,screens:raw.screens.map(s=>({id:s.id,title:s.title,fields:s.sections.flatMap(b=>b.fields.map(f=>f.label))}))},null,2));

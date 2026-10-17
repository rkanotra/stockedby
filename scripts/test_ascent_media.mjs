// Explicit opt-in real OpenAI smoke test. Input must be a synthetic fixture.
// DB persistence is mocked here; RLS/leases/storage policies have separate tests.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {processSession} from '../lib/ascent/processing.js';
import {RUBRIC_VERSION} from '../lib/ascent/catalog.js';
if(!process.argv.includes('--real-ai'))throw Error('Pass --real-ai only after approving API spend.');
const file=process.argv[2];if(!file||!file.startsWith('/tmp/ascent-qa/'))throw Error('Use a synthetic fixture under /tmp/ascent-qa/.');
const bytes=await readFile(file);let state;
const item={id:crypto.randomUUID(),lease_token:crypto.randomUUID(),attempts:1,kind:'recording',title:'Fictional onboarding recommendation',prompt:'Give a concise 90-second recommendation for a responsible onboarding pilot. This is an explicitly fictional test, not a claim about the user’s achievements.',answer:'',audience:'MD / board',target_seconds:90,context:{},media_path:'fixture/'+file.split('/').pop(),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),rubric_version:RUBRIC_VERSION};
const db={storage:{from:()=>({download:async()=>({data:new Blob([bytes])})})},rpc:async(_,{action,args})=>{if(action!=='job')throw Error('Unexpected DB action');state={...state,...args};return {data:state};}};
await processSession(db,item);
if(state?.status!=='ready')throw Error(state?.error||'Media pipeline did not finish.');
await writeFile('/tmp/ascent-qa/media-smoke-result.json',JSON.stringify(state,null,2));
console.log(JSON.stringify({status:state.status,score:state.review.overallScore,modalities:state.review.assessedModalities,wordCount:state.metrics.wordCount,duration:state.metrics.durationSeconds,transcriptionModel:state.transcript.model,usage:state.usage}));

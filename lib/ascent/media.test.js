import test from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import ffmpeg from 'ffmpeg-static';import {extractAudio} from './media.js';
const exec=promisify(execFile);
test('media extraction accepts iPhone-compatible containers and enforces duration',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'ascent-media-test-'));try{
 for(const ext of ['m4a','mov']){const file=path.join(dir,`fixture.${ext}`);await exec(ffmpeg,['-nostdin','-loglevel','error','-f','lavfi','-i','sine=frequency=440:duration=2','-c:a','aac','-y',file]);const result=await extractAudio(await readFile(file),ext,dir);assert.ok(result.duration>=1.9&&result.duration<=2.2);}
 const long=path.join(dir,'long.m4a');await exec(ffmpeg,['-nostdin','-loglevel','error','-f','lavfi','-i','anullsrc=r=16000:cl=mono','-t','182','-c:a','aac','-y',long]);await assert.rejects(extractAudio(await readFile(long),'m4a',dir),/longer than three minutes/);
 await assert.rejects(extractAudio(Buffer.from('A text document with an invalid media extension'),'mov',dir),/format is invalid/);
 }finally{await rm(dir,{recursive:true,force:true});}});

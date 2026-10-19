import test from 'node:test';
import assert from 'node:assert/strict';
import { signInAscent, passwordUpdate, passwordError } from './passwordAuth.js';
const email='rahulkanotra1101@gmail.com';
function dbFor({user={id:'owner',email,email_confirmed_at:'2026-10-18'},error=null,enabled=true}={}) {
 const calls=[];
 return {calls,auth:{signInWithPassword:async input=>{calls.push(input);return {data:{user,session:{access_token:'test-only'}},error};},signOut:async()=>{calls.push('signout');return {error:null};}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{enabled},error:null})})})})};
}
test('password sign-in authenticates the existing verified owner without exposing tokens or creating users',async()=>{
 const db=dbFor();const result=await signInAscent(db,{email:email.toUpperCase(),password:'test-password-only'});
 assert.deepEqual(result,{ok:true});assert.deepEqual(db.calls,[{email,password:'test-password-only'}]);
});
test('other addresses are rejected before an authentication request',async()=>{
 const db=dbFor();await assert.rejects(signInAscent(db,{email:'someone@example.com',password:'test-password-only'}),e=>e.status===401);assert.deepEqual(db.calls,[]);
});
test('invalid passwords and unverified or disabled owners cannot enter the studio',async()=>{
 for(const config of [{error:{status:400}},{user:{id:'owner',email,email_confirmed_at:null}},{enabled:false}]) {
  const db=dbFor(config);await assert.rejects(signInAscent(db,{email,password:'test-password-only'}),e=>e.status===401);
  if(!config.error)assert.equal(db.calls.at(-1),'signout');
 }
});
test('provider throttling is returned without retrying passwords',async()=>{
 const db=dbFor({error:{status:429}});await assert.rejects(signInAscent(db,{email,password:'test-password-only'}),e=>e.status===429);assert.equal(db.calls.length,1);
});
test('password setup rejects short or mismatched entries and preserves exact password characters',()=>{
 assert.throws(()=>passwordUpdate({password:'short',confirmPassword:'short'}),/6 and 128/);
 assert.throws(()=>passwordUpdate({password:'test-password-only',confirmPassword:'different'}),/do not match/);
 assert.deepEqual(passwordUpdate({password:' test-password-only ',confirmPassword:' test-password-only ',currentPassword:'old-test-only'}),{password:' test-password-only ',current_password:'old-test-only'});
 assert.equal(passwordError({code:'reauthentication_needed'}).includes('sign in again'),true);
});

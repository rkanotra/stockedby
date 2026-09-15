import test from 'node:test';
import assert from 'node:assert/strict';
import {sameOriginRequest} from './requestOrigin.js';
test('same-origin writes use the browser-facing host when Next has an internal URL',()=>{
 const request=(headers)=>new Request('http://localhost:3001/api/purchase-check',{method:'POST',headers});
 assert.equal(sameOriginRequest(request({host:'127.0.0.1:3001',origin:'http://127.0.0.1:3001'})),true);
 assert.equal(sameOriginRequest(request({host:'127.0.0.1:3001',origin:'https://unrelated.example'})),false);
 assert.equal(sameOriginRequest(request({host:'127.0.0.1:3001',origin:'null'})),false);
 assert.equal(sameOriginRequest(request({host:'127.0.0.1:3001'})),false);
 assert.equal(sameOriginRequest(request({host:'stockedby.com',origin:'https://stockedby.com','x-forwarded-proto':'https'})),true);
 assert.equal(sameOriginRequest(request({host:'stockedby.com',origin:'http://stockedby.com','x-forwarded-proto':'https'})),false);
 assert.equal(sameOriginRequest(request({host:'stockedby.com',origin:'https://stockedby.com.evil.test','x-forwarded-proto':'https'})),false);
});

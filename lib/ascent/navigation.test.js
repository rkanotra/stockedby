import test from 'node:test';
import assert from 'node:assert/strict';
import { studioLocation, studioHash } from './navigation.js';
const id='78962ea0-6966-4a43-b610-796a570bdff7';
test('refresh restores the same session or library without storing private answers in the URL',()=>{
 assert.deepEqual(studioLocation(studioHash('session',id)),{view:'session',id});
 assert.deepEqual(studioLocation(studioHash('history')),{view:'history',id:null});
 assert.equal(studioHash('home'), '');
});
test('invalid navigation identifiers cannot become session requests or external redirects',()=>{
 for(const hash of ['#session=../../team','#view=https://example.com','#session=private-answer',''])assert.deepEqual(studioLocation(hash),{view:'home',id:null});
 assert.equal(studioHash('session','../../team'),'');
});

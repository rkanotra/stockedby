import test from 'node:test';
import assert from 'node:assert/strict';
import {radarView} from './radarView.js';
test('combined scanner uses newest regional analysis without making an older market look fresh',()=>{
 const s=(market,id)=>({id,market,security:id});
 const cache={'radar:All':{generatedAt:'2026-11-08',signals:[s('India','oldIN'),s('US','oldUS')],summary:'Combined',feed:{fetchedAt:'2026-11-08',movers:[{market:'US',symbol:'X'}],topics:[{market:'India',title:'old'}],coverage:[]}},'radar:India':{generatedAt:'2026-11-09',signals:[s('India','newIN')],summary:'India',feed:{fetchedAt:'2026-11-09',movers:[],topics:[{market:'India',title:'new'}],coverage:[]}}};
 const r=radarView(cache);assert.deepEqual(r.signals.map(s=>s.id),['newIN','oldUS']);assert.equal(r.signals[1].checkedAt,'2026-11-08');assert.equal(r.feed.movers.length,1);assert.equal(r.feed.topics[0].title,'new');assert.equal(radarView(cache,'India').signals.length,1);assert.equal(radarView({},'All'),undefined);
});

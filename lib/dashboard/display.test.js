import test from 'node:test';
import assert from 'node:assert/strict';
import { clockParts, safeLocation, parseWeather, recentHeadlines, regionalHeadlines, DASHBOARD_MARKETS } from './display.js';
import { fetchDashboardNews, FINTECH_PUBLISHERS } from './news.js';
import { parseNews } from '../terminal/news.js';
test('clock follows the selected timezone, including date boundaries and daylight saving',()=>{
 const date=new Date('2026-11-04T23:45:07Z');assert.equal(clockParts(date,'Asia/Dubai').time,'03:45');assert.match(clockParts(date,'Asia/Dubai').date,/Thursday,? 5 November/);assert.equal(clockParts(date,'America/New_York').time,'18:45');assert.equal(clockParts(date,'America/New_York',true).period,'pm');
});
test('location preferences validate bounds and reduce coordinate precision',()=>{
 assert.equal(safeLocation({id:'unknown'}).id,'dubai');assert.equal(safeLocation({id:'location',latitude:200,longitude:55}).id,'dubai');assert.deepEqual(safeLocation({id:'location',latitude:25.204812,longitude:55.27102}),{id:'location',name:'Your location',latitude:25.2,longitude:55.27,timezone:null});
});
test('weather rejects incomplete, stale and future readings without turning missing into zero',()=>{
 const now=Date.parse('2026-11-04T12:00:00Z'),data={timezone:'Asia/Dubai',current:{time:now/1000,temperature_2m:0,weather_code:0,is_day:0}};
 assert.equal(parseWeather(data,now).temperature,0);assert.equal(parseWeather(data,now).icon,'moon');
 for(const patch of [{temperature_2m:null},{time:now/1000-4*3600},{time:now/1000+3600}])assert.throws(()=>parseWeather({...data,current:{...data.current,...patch}},now));
});
test('headlines never present old, undated, future or unsafe links as current',()=>{
 const now=Date.parse('2026-11-04T12:00:00Z'),base={title:'Issuer reports results',url:'https://example.com/news',publishedAt:new Date(now-60000).toISOString()};
 const items=[base,{...base,url:'javascript:alert(1)'},{...base,publishedAt:null},{...base,publishedAt:new Date(now-4*86400000).toISOString()},{...base,publishedAt:new Date(now+86400000).toISOString()}];assert.deepEqual(recentHeadlines({items},now),[base]);
 assert.match(DASHBOARD_MARKETS[0].note,/daily close/);assert.equal(DASHBOARD_MARKETS[1].name,'Silver');assert.match(DASHBOARD_MARKETS[3].note,/troy oz/);
});
test('dashboard news isolates failed lanes, caches requests, and retains only dated publisher headlines',async()=>{
 const now=Date.parse('2026-11-04T12:00:00Z');let calls=0;
 const fetcher=async url=>{calls++;if(url.includes('UAE')&&!url.includes('fintech'))throw Error('offline');const lane=url.includes('fintech')?'Fintech':url.includes('India')?'India':'US';return{ok:true,text:async()=>`<rss><channel><item><title>${lane} reacts to policy - Reuters</title><link>https://example.com/${lane}</link><source>Reuters</source><pubDate>${new Date(now-60000).toUTCString()}</pubDate></item></channel></rss>`};};
 const first=await fetchDashboardNews(fetcher,now);assert.equal(first.items.length,3);assert.deepEqual(first.failures,['UAE']);await fetchDashboardNews(fetcher,now+60000);assert.equal(calls,5);
 const failure=await fetchDashboardNews(async()=>{throw Error('offline');},now+11*60000);assert.equal(failure.stale,true);assert.equal(failure.items.length,3);assert.equal(failure.fetchedAt,first.fetchedAt);
});

test('regional news balances India UAE and USA and filters without stale or unrelated lanes',()=>{
 const now=Date.parse('2026-11-04T12:00:00Z');
 const items=['US','US','India','UAE','Global'].map((market,i)=>({market,title:`Headline ${i}`,url:`https://example.com/${i}`,publishedAt:new Date(now-i*60000).toISOString()}));
 assert.deepEqual(regionalHeadlines({items},'All',now).map(i=>i.market),['India','UAE','US','US']);
 assert.equal(regionalHeadlines({items},'UAE',now).length,1);assert.equal(regionalHeadlines({items},'US',now).length,2);
 assert.deepEqual(regionalHeadlines({items},'All',now+4*86400000),[]);
});

test('fintech-only publisher expansion keeps ordinary news filtering and anti-spam checks',()=>{
 const now=Date.parse('2026-11-04T12:00:00Z'),lane={market:'Global',topic:'Fintech'};
 const xml=title=>`<rss><channel><item><title>${title} - Finextra</title><link>https://example.com/fintech</link><source>Finextra</source><pubDate>${new Date(now).toUTCString()}</pubDate></item></channel></rss>`;
 const title='Bank launches new open finance payments partnership';
 assert.equal(parseNews(xml(title),lane,now).length,0);
 const items=parseNews(xml(title),lane,now,{extraPublishers:FINTECH_PUBLISHERS});assert.equal(items.length,1);
 assert.equal(regionalHeadlines({items},'Fintech',now).length,1);assert.equal(regionalHeadlines({items},'India',now).length,0);
 assert.equal(parseNews(xml('Make guaranteed profit daily'),lane,now,{extraPublishers:FINTECH_PUBLISHERS}).length,0);
});

import { DOMParser } from '@xmldom/xmldom';
import { parseNews, dedupNews } from './news.js';
import { evidenceURL } from './evidence.js';
const age=(date,now)=>(now-Date.parse(date))/86400000;
async function read(url,fetcher){const r=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(10000),headers:{'User-Agent':'StockedBy/1.0 market research contact@stockedby.com'}});if(!r.ok)throw Error(`Feed returned ${r.status}`);const t=await r.text();if(t.length>2000000)throw Error('Feed exceeded size limit');return t;}
export function parseMovers(raw,category,now=Date.now()){
 const exchanges={NMS:'NASDAQ',NGM:'NASDAQ',NCM:'NASDAQ',NYQ:'NYSE',ASE:'NYSEAMERICAN',PCX:'NYSEARCA'};
 return (raw?.finance?.result?.[0]?.quotes||[]).flatMap(q=>{
  const exchange=exchanges[q.exchange],asOf=Number.isFinite(q.regularMarketTime)?new Date(q.regularMarketTime*1000).toISOString():null;
  if(!exchange||q.currency!=='USD'||q.quoteType!=='EQUITY'||!asOf||age(asOf,now)<-.1||age(asOf,now)>5||!Number.isFinite(q.regularMarketPrice)||q.regularMarketPrice<=0||!Number.isFinite(q.regularMarketChangePercent))return [];
  const volume=Number.isFinite(q.regularMarketVolume)?q.regularMarketVolume:null,avg=Number.isFinite(q.averageDailyVolume3Month)&&q.averageDailyVolume3Month>0?q.averageDailyVolume3Month:null;
  return [{symbol:q.symbol,exchange,market:'US',name:q.longName||q.shortName||q.symbol,price:q.regularMarketPrice,change:q.regularMarketChangePercent,volume,relativeVolume:volume!==null&&avg!==null?volume/avg:null,asOf,category,source:`https://finance.yahoo.com/quote/${encodeURIComponent(q.symbol)}/`}];
 });
}
export function parseTrends(xml,market,now=Date.now()){
 const doc=new DOMParser({errorHandler:{warning:()=>{},error:()=>{},fatalError:()=>{}}}).parseFromString(xml,'text/xml');
 const val=(node,name)=>node.getElementsByTagName(name)?.[0]?.textContent?.trim()||'';
 return Array.from(doc.getElementsByTagName('item')).flatMap(n=>{
  const rawDate=val(n,'pubDate'),t=Date.parse(rawDate);if(!Number.isFinite(t)||age(rawDate,now)>3||age(rawDate,now)<-.1)return [];
  const title=val(n,'title').slice(0,200);if(!title)return [];
  const article=val(n,'ht:news_item_url');
  return [{title,market,publishedAt:new Date(t).toISOString(),traffic:val(n,'ht:approx_traffic').slice(0,30),source:evidenceURL(article)||`https://trends.google.com/trending?geo=${market==='India'?'IN':'US'}`}];
 }).slice(0,20);
}
export async function fetchRadarFeeds({market='All',now=Date.now(),fetcher=fetch}={}){
 const result={fetchedAt:new Date(now).toISOString(),movers:[],topics:[],news:[],coverage:[]},regions=market==='All'?['India','US']:[market];
 const jobs=[];
 if(regions.includes('US'))for(const [id,label] of [['day_gainers','Gainers'],['day_losers','Decliners'],['most_actives','Most active']])jobs.push((async()=>{try{const rows=parseMovers(JSON.parse(await read(`https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=${id}&count=25`,fetcher)),label,now);result.movers.push(...rows);result.coverage.push({channel:`US ${label.toLowerCase()}`,status:rows.length?'connected':'unavailable',count:rows.length,detail:'Public Yahoo screen · up to 25 equities per list · indicative / delayed, not the whole exchange.'});}catch{result.coverage.push({channel:`US ${label.toLowerCase()}`,status:'unavailable',count:0,detail:'Public mover feed unavailable. No values inferred.'});}})());
 for(const region of regions){
  jobs.push((async()=>{try{const topics=parseTrends(await read(`https://trends.google.com/trending/rss?geo=${region==='India'?'IN':'US'}`,fetcher),region,now);result.topics.push(...topics);result.coverage.push({channel:`${region} search attention`,status:topics.length?'connected':'unavailable',count:topics.length,detail:'Google Trending Now topics, not ticker search history or evidence of buying intent.'});}catch{result.coverage.push({channel:`${region} search attention`,status:'unavailable',count:0,detail:'Google public trending-topic feed unavailable.'});}})());
  for(const query of [`${region==='India'?'(NSE OR BSE)':'(NYSE OR Nasdaq)'} (earnings OR guidance OR contract OR acquisition) when:3d`,`${region==='India'?'India (promoter OR insider) (purchase OR disclosure)':'"insider" "purchase"'} when:7d`])jobs.push((async()=>{try{const items=parseNews(await read(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,fetcher),{market:region,topic:'Radar'},now).slice(0,15);result.news.push(...items);result.coverage.push({channel:`${region} ${query.includes('insider')?'disclosure leads':'company news'}`,status:items.length?'connected':'unavailable',count:items.length,detail:'Discovery headlines; the AI review must corroborate company claims against dated sources.'});}catch{result.coverage.push({channel:`${region} news discovery`,status:'unavailable',count:0,detail:'Headline feed unavailable.'});}})());
 }
 if(regions.includes('India'))result.coverage.push({channel:'India price / volume universe',status:'not connected',count:0,detail:'India candidates come from current company-news and disclosure searches. Exchange-wide price/volume ranking needs a licensed or broker feed.'});
 await Promise.all(jobs);result.news=dedupNews(result.news).slice(0,60);result.movers=[...new Map(result.movers.map(m=>[`${m.exchange}:${m.symbol}`,m])).values()];
 result.coverage.push({channel:'Insider transaction monitor',status:'search-based',detail:'Primary filings checked in each scan where found; no exhaustive exchange-wide Form 4 or promoter transaction database.'},{channel:'Company search-interest history',status:'not connected',detail:'Google Trends historical API access is not configured. General trending topics are shown separately.'});
 return result;
}

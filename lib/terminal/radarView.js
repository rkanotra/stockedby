// Regional jobs and manual combined scans share one view, without relabelling old
// evidence as new. Choose the newest analysis and newest feed for each market.
export function radarView(cache={},market='All') {
  const regions=market==='All'?['India','US']:[market],parts=[],feeds=[];
  for(const region of regions){
    const entries=[cache['radar:All'],cache[`radar:${region}`]].filter(Boolean);
    const report=entries.filter(v=>v.generatedAt).sort((a,b)=>Date.parse(b.generatedAt)-Date.parse(a.generatedAt))[0];
    const feed=entries.map(v=>v.feed).filter(Boolean).sort((a,b)=>Date.parse(b.fetchedAt)-Date.parse(a.fetchedAt))[0];
    if(report)parts.push({region,report});
    if(feed)feeds.push({region,feed});
  }
  if(!parts.length&&!feeds.length)return undefined;
  const unique=values=>[...new Set(values)];
  const signals=parts.flatMap(({region,report})=>(report.signals||[]).filter(s=>s.market===region).map(s=>({...s,checkedAt:report.generatedAt})));
  signals.sort((a,b)=>(b.priority==='Urgent review')-(a.priority==='Urgent review') || Number(b.held)-Number(a.held) || (b.channels?.length||0)-(a.channels?.length||0));
  const current=cache[`radar:${market}`];
  return {...current,
    generatedAt:parts.map(p=>p.report.generatedAt).sort().at(-1),
    scans:parts.map(p=>({market:p.region,at:p.report.generatedAt})),
    summary:unique(parts.map(p=>p.report.summary).filter(Boolean)).join(' '),
    signals,gaps:unique(parts.flatMap(p=>p.report.gaps||[])),
    lastError:unique([current?.lastError,...parts.map(p=>p.report.lastError)].filter(Boolean)).join(' '),
    feed:feeds.length?{
      fetchedAt:feeds.map(p=>p.feed.fetchedAt).sort().at(-1),
      movers:feeds.flatMap(({region,feed})=>(feed.movers||[]).filter(m=>m.market===region)),
      topics:feeds.flatMap(({region,feed})=>(feed.topics||[]).filter(t=>t.market===region)),
      coverage:[...new Map(feeds.flatMap(({region,feed})=>(feed.coverage||[]).filter(c=>!c.channel.startsWith(region==='India'?'US ':'India '))).map(c=>[c.channel,c])).values()],
    }:undefined,
  };
}

import OpenAI from 'openai';
// Adapt the Responses API's cited sources to the shared research validator.
// No provider fallback is silent: the usage record always names the serving provider.
export function openaiResearchClient(client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 0, timeout: 65000 })) {
  return { models: { generateContent: async ({ contents, config }) => {
    const strictSchema = value => {
      if (!value || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(strictSchema);
      return { ...Object.fromEntries(Object.entries(value).map(([k,v])=>[k,strictSchema(v)])), ...(value.type==='object'?{additionalProperties:false}:{}) };
    };
    const model = process.env.TERMINAL_OPENAI_MODEL || 'gpt-5.4-mini';
    const detailed = config.researchDepth === 'detailed';
    const radar = config.researchDepth === 'radar';
    const response = await client.responses.create({model, input:contents, store:false, tools:[{type:'web_search',search_context_size:(detailed||radar)?'medium':'low'}],tool_choice:'required',include:['web_search_call.action.sources'],max_tool_calls:radar?7:detailed?5:3,max_output_tokens:detailed?24000:radar?16000:10000,reasoning:{effort:detailed?'medium':'low'},text:{format:{type:'json_schema',name:'market_research',strict:true,schema:strictSchema(config.responseJsonSchema)}}}, {timeout:detailed?150000:radar?140000:65000});
    const searches=(response.output||[]).filter(o=>o.type==='web_search_call');
    const citations=(response.output||[]).filter(o=>o.type==='message').flatMap(o=>o.content||[]).flatMap(c=>c.annotations||[]).filter(a=>a.type==='url_citation');
    const sources=[...searches.flatMap(s=>s.action?.sources||[]),...citations].filter(s=>s.url);
    const u=response.usage||{},cached=u.input_tokens_details?.cached_tokens||0;
    const priced=model==='gpt-5.4-mini';
    const usage={provider:'OpenAI',model:response.model||model,input:u.input_tokens??null,output:u.output_tokens??null,total:u.total_tokens??null,cached,thinking:u.output_tokens_details?.reasoning_tokens??null,groundingRequests:searches.length,reportedSearchQueries:searches.length,billableSearchQueries:null,tokenCostEstimateUSD:priced&&u.input_tokens!=null&&u.output_tokens!=null?(Math.max(0,u.input_tokens-cached)*.75+cached*.075+u.output_tokens*4.5)/1000000:null,groundingCostUSD:null,actualCostUSD:null,pricingAsOf:'2026-11-03',note:'Token estimate excludes web search charges. Search calls and tokens are measured; actual billing and credits are available in OpenAI Platform.'};
    if(response.status!=='completed')throw Object.assign(Error(response.incomplete_details?.reason==='max_output_tokens'?'The review reached its output limit. Financial evidence is saved; retry the review.':`The research provider stopped before completing the review (${response.incomplete_details?.reason||response.status||'unknown reason'}). Saved evidence remains available.`),{usage,code:response.incomplete_details?.reason||response.status});
    return { text:response.output_text, terminalUsage:usage,candidates:[{groundingMetadata:{groundingChunks:sources.map(s=>({web:{uri:s.url,title:s.title||s.url}})),webSearchQueries:searches.flatMap(s=>s.action?.queries||[s.action?.query]).filter(Boolean)}}] };
  } } };
}

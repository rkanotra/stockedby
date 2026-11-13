import { runDossier } from './dossier.js';
import { researchHoldings } from './dossierData.js';
import { instrumentId, isListingResolved } from './domain.js';
import { fetchPrices, priceIdentity } from './prices.js';
import { keepLastValid } from './feeds.js';
import { reviewsEnabled, reviewCandidates } from './reviewTriggers.js';

// If the function stopped between saving a report and publishing its alert,
// deliver from the saved report. The database deduplicates by event key.
async function recoverAlerts(store, state) {
  const batches = researchHoldings(state.document.positions).map(p => {
    const security=instrumentId(p), ack=state.cache['auto-delivered:'+security]?.at || '';
    const reports=(state.cache['dossier:'+security]?.reports || []).filter(r=>r.newsAlert && r.createdAt>ack);
    return {security,reports};
  }).filter(b=>b.reports.length);
  if (!batches.length) return;
  const run=await store('begin',{key:'deliver:'+crypto.randomUUID(),kind:'refresh'});
  await store('finish',{...run,status:'complete',result:{kind:'alert_delivery'},alerts:batches.flatMap(b=>b.reports.map(r=>r.newsAlert))});
  for (const {security,reports} of batches) await store('cache',{key:'auto-delivered:'+security,data:{at:reports.map(r=>r.createdAt).sort().at(-1)}});
}

// Each invocation reserves at most one detailed AI review inside the serverless
// deadline. Separate scheduled slots drain larger imports without a browser.
export async function automaticResearch(store, options={}, deps={}) {
  const now=options.now || new Date(), state=await store('load');
  if (!reviewsEnabled(state)) return {status:'skipped'};
  await recoverAlerts(store,state);
  const item=reviewCandidates(state,{...options,now})[0];
  if (!item) return {status:'skipped'};
  const {p,trigger:{security}}=item, key='auto-attempt:'+security;
  try {
    if (!isListingResolved(p,state.cache[security])) {
      const id=priceIdentity(p), prices=id && await (deps.prices||fetchPrices)([id]);
      const next=prices?.[security];
      if (!isListingResolved(p,next)) throw Error('Listing not verified');
      await store('cache',{key:security,data:keepLastValid(state.cache[security],next)});
    }
    const result=await (deps.review||runDossier)(store,{security,now},{automatic:true,...deps.dossier});
    return {status:result.status};
  } catch(e) {
    if (e.status===409 || e.status===429 || /limit reached|another scan/i.test(e.message)) return {status:'deferred'};
    await store('cache',{key,data:{at:now.toISOString(),retryAt:new Date(now.getTime()+4*3600000).toISOString(),reason:'Automatic review could not finish; a later window will retry.'}});
    return {status:'partial'};
  }
}

// A returned URL establishes source presence, not that it proves a claim.
// Apply these checks to saved research as well as new model responses.
export function evidenceURL(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}

const narrativeFields = ['stance','valuation','catalyst','downside','technical','opposingCase','entryConditions','invalidation','overlap'];
export function checkResearchEvidence(research) {
  const sources = (research.sources || []).map(source => ({ ...source, url: evidenceURL(source.url) })).filter(source => source.url);
  const known = new Set(sources.map(source => source.url));
  const gaps = [...(research.gaps || [])];
  const assessments = (research.assessments || []).flatMap(assessment => {
    const facts = (assessment.facts || []).filter(fact => known.has(evidenceURL(fact.url))).map(fact => ({ ...fact, url: evidenceURL(fact.url), supported: true }));
    const factSources = new Set(facts.map(fact => fact.url));
    // Reject a whole thesis when its inline citations are unrelated to its own
    // evidence. Removing just the bad link would leave the unsupported advice.
    const inlineURLs = narrativeFields.flatMap(field => String(assessment[field] || '').match(/https?:\/\/[^\s)<>\]]+/g) || []);
    if (!facts.length || inlineURLs.some(url => !factSources.has(evidenceURL(url)))) {
      gaps.push(`${assessment.exchange}:${assessment.symbol} assessment withheld: its claims lacked returned sources or its commentary cited sources outside its own evidence.`);
      return [];
    }
    if (facts.length < (assessment.facts || []).length) gaps.push(`${assessment.exchange}:${assessment.symbol}: claims without returned sources were removed.`);
    return [{ ...assessment, facts }];
  });
  return { ...research, sources, assessments, gaps: [...new Set(gaps)], grounded: sources.length > 0, evidenceCheckVersion: 1 };
}

export function checkSavedResearch(state) {
  return {
    ...state,
    cache: Object.fromEntries(Object.entries(state.cache || {}).map(([key, value]) => [key, key.startsWith('research:') ? checkResearchEvidence(value) : value])),
    runs: (state.runs || []).map(run => run.result?.research ? { ...run, result: { ...run.result, research: run.result.research.map(checkResearchEvidence) } } : run),
  };
}

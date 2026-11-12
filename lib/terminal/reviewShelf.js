// A dated portfolio audit can coexist with the investor's own detailed
// reviews. Neither source overwrites the other or changes AI usage.
export function reviewShelf(saved, audit) {
  return [...(saved?.reports || []), ...(audit ? [audit] : [])]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export const researchStances = ['Buy', 'Hold', 'Sell', 'Wait'];

export function holdingDecision(cache, security) {
  const saved = cache?.['dossier:' + security];
  const report = reviewShelf(saved, cache?.['coverage-review:' + security])[0];
  if (!researchStances.includes(report?.decision?.stance)) return null;
  return {
    stance: report.decision.stance, reason: report.decision.text || '',
    confidence: report.decision.confidence || '', date: report.createdAt,
    changed: Boolean(saved?.evidence?.fetchedAt && report.evidenceAt && Date.parse(saved.evidence.fetchedAt) > Date.parse(report.evidenceAt)),
  };
}

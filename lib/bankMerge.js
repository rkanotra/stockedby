// Pure merge logic shared by the server-side loader (lib/bank.js, reads via
// fs) and the client-safe loader (lib/bankStatic.js, static JSON imports for
// the category picker). Seed files carry real harvested snapshots (rule 2:
// never fabricate data) that get APPENDED onto a matching bank category's
// own snapshots — never wholesale-replace it. A seed file predates the
// bank's current queries/qid scheme (it exists to seed a few real Claude
// snapshots, not to redefine the category), so byId.set(seedCat) here used
// to silently discard the bank's own queries and any snapshots the bank
// category already carried — a real bug, not a hypothetical one: it left
// data/india.json's real 4-query, 10-snapshot "tws-earbuds" category
// replaced by the seed's stale 2-query, 2-snapshot version. Only a genuinely
// new id (no bank match at all) gets added as-is.
//
// `version`/`generatedAt` (query-bank versioning, market-expansion phase)
// are passed through from the primary bank file — this used to silently
// drop everything except market/categories, which would have dropped a
// bank's version metadata the moment it went through this merge.
export function mergeBank(bank, seed) {
  const byId = new Map(bank.categories.map((c) => [c.id, c]));
  if (seed) {
    for (const seedCat of seed.categories) {
      const bankCat = byId.get(seedCat.id);
      if (!bankCat) {
        byId.set(seedCat.id, seedCat);
        continue;
      }
      byId.set(seedCat.id, {
        ...bankCat,
        snapshots: [...(bankCat.snapshots || []), ...(seedCat.snapshots || [])],
      });
    }
  }
  return {
    market: bank.market,
    version: bank.version ?? null,
    generatedAt: bank.generatedAt ?? null,
    categories: [...byId.values()],
  };
}

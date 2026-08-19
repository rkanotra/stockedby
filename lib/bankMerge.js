// Pure merge logic shared by the server-side loader (lib/bank.js, reads via
// fs) and the client-safe loader (lib/bankStatic.js, static JSON imports for
// the category picker). Seed files carry real harvested snapshots (rule 2:
// never fabricate data) and take precedence over a same-id bank category's
// empty snapshots array.
export function mergeBank(bank, seed) {
  const byId = new Map(bank.categories.map((c) => [c.id, c]));
  if (seed) {
    for (const cat of seed.categories) byId.set(cat.id, cat);
  }
  return { market: bank.market, categories: [...byId.values()] };
}

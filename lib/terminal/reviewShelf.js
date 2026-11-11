// A dated portfolio audit can coexist with the investor's own detailed
// reviews. Neither source overwrites the other or changes AI usage.
export function reviewShelf(saved, audit) {
  return [...(saved?.reports || []), ...(audit ? [audit] : [])]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

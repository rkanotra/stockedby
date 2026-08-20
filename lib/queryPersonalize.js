// Bank branded-routing queries name a category "leader_brand" verbatim
// ("Where can I buy genuine Minimalist vitamin C serum..."). Left as-is,
// every merchant's free test asks the SAME question about whatever brand
// happens to lead that category — polluting their own report's searches
// and trusted sources with the leader's data, not theirs (bug: a merchant
// testing "Pilgrim" got Plum-specific search results and citations).
//
// Personalizing to the merchant's own entered brand is the default; testing
// the bank's original leader-brand routing question is a deliberate later
// feature (competitive intel), not what a free test silently does today.
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function personalizeBrandedRouting(originalText, leaderBrand, merchantBrand) {
  if (!leaderBrand || !merchantBrand) return originalText;
  const re = new RegExp(escapeRegExp(leaderBrand), "i");
  if (!re.test(originalText)) return originalText;
  return originalText.replace(re, merchantBrand);
}

// The text actually shown/submitted for a query: the merchant's manual
// edit if they made one, otherwise the branded-routing question rewritten
// to their own brand (falling back to the original bank text once they've
// cleared the brand field, or for every other archetype untouched).
export function effectiveQueryText(query, brand) {
  if (query.userEdited) return query.text;
  const original = query.originalText ?? query.text;
  if (query.archetype !== "branded-routing" || !query.leader_brand) return original;
  const b = (brand || "").trim();
  if (!b) return original;
  return personalizeBrandedRouting(original, query.leader_brand, b);
}

import { ENGINE_ORDER, matches, normalize, domainsMatch } from "./scoring";

// Shared by components/test/report/StoryView.js (client) and
// app/api/lead/route.js (server, for the Layer-1-only merchant email) — one
// computation, two renderers, so the email and the on-screen story can
// never silently drift apart. Every function here is pure and reads only
// from the same report shape lib/reports.js already persists (report,
// engines, sentiment, trustedSources) — no new data collection, just a
// simpler read of what's already there.

// "Do AI apps recommend {brand}?" — YES/SOMETIMES/NO from the organic
// appearance count, same appearanceSummary the verdict tiers already use.
export function buildAppearanceStory(appearanceSummary) {
  const appearedIn = appearanceSummary?.appearedIn ?? 0;
  const totalAttempted = appearanceSummary?.totalAttempted ?? 0;
  let verdict = "NO";
  if (appearedIn > 0 && appearedIn === totalAttempted) verdict = "YES";
  else if (appearedIn > 0) verdict = "SOMETIMES";
  return { verdict, appearedIn, totalAttempted };
}

// "Who does AI recommend?" — combined top brands across every engine's
// organic (non branded-routing) recommendations, ranked by how often each
// one showed up. Brand names are deduped case/punctuation-insensitively
// (lib/scoring.js's normalize()) but displayed using whichever original
// casing was seen first.
export function buildTopBrands(engines, brand, limit = 5) {
  const tally = new Map();
  ENGINE_ORDER.forEach((engine) => {
    (engines?.[engine] || []).forEach((row) => {
      if (row.archetype === "branded-routing") return;
      (row.recs || []).forEach((rec) => {
        const label = rec.brand || rec.product;
        const key = normalize(label);
        if (!key) return;
        const entry = tally.get(key) || { label, count: 0 };
        entry.count += 1;
        tally.set(key, entry);
      });
    });
  });
  const top = [...tally.values()].sort((a, b) => b.count - a.count).slice(0, limit);
  const brandInTop = top.some((e) => matches(brand, e.label));
  return { top, brandInTop };
}

// "Where does AI send buyers to pay?" — counts, not percentages, and only
// "your shop" (brand-direct) vs. a real competing shop (marketplace/
// aggregator) — a "none" destination (no link given) is neither, so it's
// excluded from both buckets rather than padding "other shops."
export function buildDestinationStory(yourDestinations) {
  const list = yourDestinations || [];
  const yours = list.filter((d) => d.destination === "brand-direct").reduce((s, d) => s + d.count, 0);
  const others = list.filter((d) => d.destination !== "brand-direct" && d.destination !== "none").reduce((s, d) => s + d.count, 0);
  const topOther = list
    .filter((d) => d.destination !== "brand-direct" && d.destination !== "none")
    .sort((a, b) => b.count - a.count)[0] || null;
  return { yours, others, topOtherDomain: topOther?.domain || null };
}

// "What should you do now?" — always exactly 3: up to 2 picked from real
// signal in this report (priority order below, each cascading to the next
// only if still short of 2), then a constant closing action. Never invents
// a suggestion the data doesn't support (rule 2) — every conditional line
// only fires when its underlying number actually says so; only the very
// last fallback ("test again monthly") is unconditional, as the floor that
// guarantees 2 candidates even for an otherwise-uneventful report.
//
// Each action is {text, href}. href is null for plain text; when the
// brand's own site never appeared as a destination, the action links to
// /audit (prefilled with the brand's domain when known) so the merchant can
// go check why — the report's own cross-link to the free site check.
export function buildActions({ appearanceSummary, yourDestinations, trustedSources, sentiment, brandWebsite }) {
  const appearedIn = appearanceSummary?.appearedIn ?? 0;
  const totalAttempted = appearanceSummary?.totalAttempted ?? 0;
  const brandDirectCount = (yourDestinations || [])
    .filter((d) => d.destination === "brand-direct")
    .reduce((s, d) => s + d.count, 0);

  // "Get reviewed on X" only makes sense for a source that ISN'T the
  // brand's own site — exclude it (and any www/subdomain variant, via
  // domainsMatch) from outreach suggestions. If the brand's own domain IS
  // among the trusted sources, that's a genuinely positive finding
  // (candidates below), not a fix to suggest.
  const externalSources = (trustedSources || [])
    .map(([source]) => source)
    .filter((source) => !brandWebsite || !domainsMatch(source, brandWebsite));
  const ownDomainIsSource =
    Boolean(brandWebsite) && (trustedSources || []).some(([source]) => domainsMatch(source, brandWebsite));

  // Hands out each external source at most once across all candidates, so
  // two different tips can never end up naming the same domain.
  const usedSources = new Set();
  function nextSource() {
    const src = externalSources.find((s) => !usedSources.has(s));
    if (src) usedSources.add(src);
    return src || null;
  }

  const candidates = [];
  if (appearedIn === 0) {
    const source = nextSource();
    candidates.push({
      text: source ? `Get your product reviewed on ${source}.` : "Get listed on real review sites — AI trusts them.",
      href: null,
    });
  }
  if (appearedIn > 0 && brandDirectCount === 0) {
    const auditHref = brandWebsite ? `/audit?domain=${encodeURIComponent(brandWebsite)}` : "/audit";
    candidates.push({ text: "Check if AI can read your website →", href: auditHref });
  }
  if (sentiment && sentiment.sentiment === "negative") {
    candidates.push({ text: `AI calls you "${sentiment.positioning}" — that needs fixing.`, href: null });
  }
  if (appearedIn > 0 && appearedIn < totalAttempted) {
    candidates.push({ text: "You show up sometimes — be consistent everywhere.", href: null });
  }
  if (ownDomainIsSource) {
    candidates.push({ text: "Good news — AI already reads your website. Keep your product pages updated.", href: null });
  }
  if (candidates.length < 2) {
    const source = nextSource();
    if (source) candidates.push({ text: `Get featured on ${source} too.`, href: null });
  }
  if (candidates.length < 2 && appearedIn > 0) {
    candidates.push({ text: "Keep your product details fresh so AI keeps recommending you.", href: null });
  }
  if (candidates.length < 2) {
    candidates.push({ text: "Test again monthly — AI answers change often.", href: null });
  }
  const actions = candidates.slice(0, 2);
  actions.push({ text: "Ask us how to fix this — reply to your report email.", href: null });
  return actions;
}

// The merchant email's own "three tips" (lib/email.js) — same underlying
// signals as buildActions above (trusted sources, whether the brand's own
// site ever appears as a destination) but always exactly these three, in
// this order, regardless of verdict — the email's fix-plan doesn't
// reshuffle candidates the way the on-screen card does, it's a fixed,
// always-useful trio: get reviewed somewhere real, make the site AI-
// readable, and remember this isn't a one-time score.
export function buildEmailTips({ trustedSources, brandWebsite }) {
  // Same own-domain exclusion as buildActions above — never suggest the
  // merchant get "reviewed" on their own site.
  const externalSources = (trustedSources || []).filter(
    ([source]) => !brandWebsite || !domainsMatch(source, brandWebsite)
  );
  const ownDomainIsSource =
    Boolean(brandWebsite) && (trustedSources || []).some(([source]) => domainsMatch(source, brandWebsite));
  const topSource = externalSources[0];
  const topSourceName = topSource?.[0];
  const topSourceCount = topSource?.[1];

  const tip1 = topSourceName
    ? `Get reviewed on ${topSourceName} — AI read it ${topSourceCount} time${topSourceCount === 1 ? "" : "s"} before answering.`
    : ownDomainIsSource
    ? "Good news — AI already reads your website. Keep your product pages updated."
    : "Get listed on real review sites — AI trusts them.";

  return [
    tip1,
    "Make your website readable to AI — free check: stockedby.com/audit",
    "AI answers change monthly — recheck free anytime.",
  ];
}

// One call for all four cards at once — used by both StoryView.js and
// app/api/lead/route.js's email builder.
export function buildLayerOne({ brand, report, engines, sentiment, trustedSources, brandWebsite }) {
  const appearance = buildAppearanceStory(report?.appearanceSummary);
  const brands = buildTopBrands(engines, brand);
  const destinations = buildDestinationStory(report?.destinations?.yourDestinations);
  const actions = buildActions({
    appearanceSummary: report?.appearanceSummary,
    yourDestinations: report?.destinations?.yourDestinations,
    trustedSources,
    sentiment,
    brandWebsite,
  });
  const emailTips = buildEmailTips({ trustedSources, brandWebsite });
  return { appearance, brands, destinations, actions, emailTips };
}

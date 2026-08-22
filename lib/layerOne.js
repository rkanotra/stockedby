import { ENGINE_ORDER, matches, normalize } from "./scoring";

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
  const topSource = trustedSources?.[0]?.[0];

  const candidates = [];
  if (appearedIn === 0) {
    candidates.push({
      text: topSource ? `Get your product reviewed on ${topSource}.` : "Get listed on real review sites — AI trusts them.",
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
  if (candidates.length < 2 && topSource) {
    candidates.push({ text: `Get featured on ${topSource} too.`, href: null });
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
  return { appearance, brands, destinations, actions };
}

import { ENGINE_ORDER, matches, normalize, domainsMatch, sanitizeBrandLabel } from "./scoring.js";

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
        if (!rec) return;
        const label = sanitizeBrandLabel(rec.brand || rec.product);
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
  const topOthers = [...tally.values()]
    .filter((e) => !matches(brand, e.label))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return { top, brandInTop, topOthers };
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

const DIFFICULTY = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };

// Richer, structured version of buildActions — for the PDF report's "Page
// 3: Recommended actions" only. Same underlying signals and same own-
// domain exclusion/dedupe rules as buildActions (so the PDF can never
// disagree with the on-screen card or the email), just {title, why,
// difficulty, effect} instead of one terse sentence, and 3-5 items instead
// of 2 — the PDF has room to explain. The floor items (always true
// regardless of this report's numbers — never a claim ABOUT the data) keep
// the list at 3+ even for an otherwise-uneventful "everything's fine" report.
export function buildFixPlan({ appearanceSummary, yourDestinations, trustedSources, sentiment, brandWebsite }) {
  const appearedIn = appearanceSummary?.appearedIn ?? 0;
  const totalAttempted = appearanceSummary?.totalAttempted ?? 0;
  const brandDirectCount = (yourDestinations || [])
    .filter((d) => d.destination === "brand-direct")
    .reduce((s, d) => s + d.count, 0);

  const externalSources = (trustedSources || []).filter(
    ([source]) => !brandWebsite || !domainsMatch(source, brandWebsite)
  );
  const ownDomainIsSource =
    Boolean(brandWebsite) && (trustedSources || []).some(([source]) => domainsMatch(source, brandWebsite));

  const usedSources = new Set();
  function nextSource() {
    const entry = externalSources.find(([s]) => !usedSources.has(s));
    if (entry) usedSources.add(entry[0]);
    return entry || null;
  }

  const items = [];

  if (appearedIn === 0) {
    const source = nextSource();
    items.push(
      source
        ? {
            title: `Get reviewed on ${source[0]}`,
            why: `AI read ${source[0]} ${source[1]} time${source[1] === 1 ? "" : "s"} before answering — sites it already trusts get cited more.`,
            difficulty: DIFFICULTY.MEDIUM,
            effect: "More likely to appear next time AI recommends brands in this category.",
          }
        : {
            title: "Get listed on real review sites",
            why: "AI cites review and comparison sites before recommending brands — you don't appear on any yet.",
            difficulty: DIFFICULTY.MEDIUM,
            effect: "Gives AI a real, citable source to recommend you from.",
          }
    );
  }

  if (appearedIn > 0 && brandDirectCount === 0) {
    items.push({
      title: "Make your website readable to AI",
      why: "AI never sent a single buyer to your own site in this test — only to other shops.",
      difficulty: DIFFICULTY.EASY,
      effect: "Keep more of each sale instead of paying marketplace commission.",
    });
  }

  if (sentiment && sentiment.sentiment === "negative") {
    items.push({
      title: "Fix how AI describes you",
      why: `AI called you "${sentiment.positioning}" — that framing can cost you sales.`,
      difficulty: DIFFICULTY.HARD,
      effect: "Improve buyer trust the moment AI mentions you.",
    });
  }

  if (appearedIn > 0 && appearedIn < totalAttempted) {
    items.push({
      title: "Be consistent everywhere",
      why: `You appeared in ${appearedIn} of ${totalAttempted} shopper questions — inconsistent presence reads as unreliable to AI.`,
      difficulty: DIFFICULTY.MEDIUM,
      effect: "More predictable recommendations across every shopper question.",
    });
  }

  if (ownDomainIsSource) {
    items.push({
      title: "Keep your product pages updated",
      why: "AI already reads your own website as a source for its answers.",
      difficulty: DIFFICULTY.EASY,
      effect: "Maintains the visibility you already have.",
    });
  }

  if (items.length < 3) {
    const source = nextSource();
    if (source) {
      items.push({
        title: `Get featured on ${source[0]} too`,
        why: `AI read ${source[0]} ${source[1]} time${source[1] === 1 ? "" : "s"} before answering.`,
        difficulty: DIFFICULTY.MEDIUM,
        effect: "A second real source AI can cite alongside the first.",
      });
    }
  }

  // Floor — always true regardless of this report's numbers, never a
  // fabricated claim about the data, just enough to guarantee 3+ items.
  const floor = [
    {
      title: "Track your position monthly",
      why: "AI answers shift over time — a single test is a snapshot, not a certificate.",
      difficulty: DIFFICULTY.EASY,
      effect: "Catch a slipping position before a competitor locks it in.",
    },
    {
      title: "Test your other products too",
      why: "Each product category gets its own free AI visibility report.",
      difficulty: DIFFICULTY.EASY,
      effect: "A full picture of where AI does — and doesn't — recommend you.",
    },
    {
      title: "Keep product pages accurate and complete",
      why: "AI reads your product pages directly when it forms an answer.",
      difficulty: DIFFICULTY.EASY,
      effect: "Gives AI the clearest possible information to recommend you from.",
    },
  ];
  for (let i = 0; items.length < 3 && i < floor.length; i++) items.push(floor[i]);

  return items.slice(0, 5);
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
  const fixPlan = buildFixPlan({
    appearanceSummary: report?.appearanceSummary,
    yourDestinations: report?.destinations?.yourDestinations,
    trustedSources,
    sentiment,
    brandWebsite,
  });
  return { appearance, brands, destinations, actions, emailTips, fixPlan };
}

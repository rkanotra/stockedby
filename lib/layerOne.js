import { ENGINE_ORDER, matches, normalize, sanitizeBrandLabel } from "./scoring.js";

// Two small, still-live pure functions. This file used to be the
// founder-first redesign's data layer (buildLayerOne() combined these
// with buildActions/buildFixPlan/buildEmailTips/buildDestinationStory
// into one "Layer 1" object for the old StoryView.js + the merchant
// email); that role now belongs to lib/founderReport.js, which reuses
// buildTopBrands below directly rather than duplicating it. The other
// four functions were deleted with their only caller (buildLayerOne)
// once nothing read their output anymore — see git history if you need
// the old "3 tips" / "5-item fix plan" shape back.
//
// buildAppearanceStory is still read directly by
// components/test/report/AIVisibilityHero.js and
// lib/pdf/buildReportPdf.js; buildTopBrands is still read directly by
// lib/founderReport.js and app/api/test/route.js's contradiction guard.

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


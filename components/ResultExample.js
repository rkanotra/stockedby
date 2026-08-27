import Link from "next/link";
import { HERO_BRAND, HERO_ENGINES } from "@/lib/heroExample";

// "What a result looks like" (homepage narrative, brief section 17) — every
// number here is computed from the SAME real snapshot data Hero.js's live
// demo reads (lib/heroExample.js, hard rule 2: never fabricate), just
// summarized the way a founder would actually read a verdict: brand,
// headline verdict, one supporting stat, the one thing that actually
// matters, then what to do about it. Not a live report — an illustrative,
// clearly-labeled example of the shape a real one takes.
const engineCount = HERO_ENGINES.length;
const appearedEngines = HERO_ENGINES.filter((e) => e.youAppears);
const appearedCount = appearedEngines.length;
const bestRank = appearedCount > 0 ? Math.min(...appearedEngines.map((e) => e.bestRank)) : null;

const verdict = appearedCount === 0 ? "NOT STOCKED" : appearedCount === engineCount ? "ON THE SHELF" : "BARELY STOCKED";

const marketplaceCount = appearedEngines.filter((e) => e.youDestKey === "marketplace" || e.youDestKey === "aggregator").length;
const ownSiteCount = appearedEngines.filter((e) => e.youDestKey === "brand-direct").length;

let callout = null;
if (marketplaceCount > ownSiteCount) {
  callout = `AI recommends ${HERO_BRAND} — but sends buyers to a marketplace instead of ${HERO_BRAND}'s own site.`;
} else if (ownSiteCount > 0) {
  callout = `AI recommends ${HERO_BRAND} — and sends buyers straight to ${HERO_BRAND}'s own site.`;
}

let opportunity = null;
if (marketplaceCount > ownSiteCount) {
  opportunity = "Make your own product pages the destination AI recommends, not a marketplace listing.";
} else if (appearedCount < engineCount) {
  opportunity = "Show up consistently across every AI app, not just some of them.";
}

export default function ResultExample() {
  return (
    <section id="result-example" className="result-example">
      <div className="wrap">
        <div className="aisle-head rv">
          <h2>What a result looks like</h2>
        </div>
        <p className="aisle-sub rv">A real example, from a real test — not a mockup.</p>

        <div className="result-card rv">
          <div className="result-brand mono">{HERO_BRAND}</div>
          <div className="result-verdict">{verdict}</div>
          <p className="result-line">
            {HERO_BRAND} appears in {appearedCount} of {engineCount} AI apps we checked
            {bestRank ? `, best position #${bestRank}` : ""}.
          </p>

          {callout && <div className="result-callout">{callout}</div>}

          <div className="result-dest-list">
            {HERO_ENGINES.map((e) => (
              <div className="result-dest-row" key={e.id}>
                <span>{e.label}</span>
                <span>{e.youAppears ? e.youDestLabel || "No link given" : "Not recommended"}</span>
              </div>
            ))}
          </div>

          {opportunity && (
            <p className="result-opportunity">
              <b>Biggest opportunity</b> — {opportunity}
            </p>
          )}

          <Link href="/test" className="btn-ghost">
            Check my brand — free
          </Link>
        </div>
      </div>
    </section>
  );
}

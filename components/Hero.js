import { ENGINE_ORDER, ENGINE_LABELS, matches, effectiveDestination, DEST_LABELS } from "@/lib/scoring";
import indiaBank from "@/data/india.json";
import indiaSeed from "@/data/snapshots-india-seed.json";
import HeroReportCard from "./HeroReportCard";
import DomainCheckForm from "./DomainCheckForm";

// Real snapshots only (hard rule 2: never fabricate) — resolved once at
// module load (static JSON imports, no fetch) so the hero report-card mock
// is built from data/india.json / data/snapshots-india-seed.json, not
// invented copy.
const HERO_BRAND = "Minimalist";
const HERO_BANK_CATEGORY_ID = "face-serum-vitamin-c";
// The discovery query, not problem-first: this is the shelf-browsing
// question the hero's own headline is about ("who does AI recommend"),
// and — checked directly against the harvested data before picking it —
// it's genuinely clean India-only results on every engine (Indian brands,
// .in/.co domains, amazon.in). An earlier version of this file used the
// problem-first query instead, which does have real chatgpt-harvest rows
// with US brands and amazon.com — accurate to what was actually harvested,
// but wrong for a hero mock meant to represent the India market.
const HERO_BANK_QID = "face-serum-vitamin-c-discovery";
// Real Claude seed for this same product. Used to be filed under a
// different id ("vitamin-c-serum") than data/india.json's real category —
// lib/bankMerge.js's mergeBank() replaced the whole bank category with the
// seed's stale 1-query version on id match, so the two were kept
// deliberately un-matched here as a workaround. Both are now fixed
// (mergeBank deep-merges instead of replacing; the seed id was renamed to
// match), so this is just the category id like everywhere else.
const HERO_SEED_CATEGORY_ID = "face-serum-vitamin-c";

const DEST_CLASS = { "brand-direct": "direct", marketplace: "mktpl", aggregator: "aggr" };
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatDateLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

// A real snapshot can carry a typographic non-breaking hyphen in place of
// an ascii one (seen in some ChatGPT harvests, e.g. "brand‑direct") —
// normalize before matching the exact "brand-direct"/"marketplace"/etc.
// enum strings, so a real recommendation doesn't silently misrender as "no
// link" over a character-encoding quirk.
const normalizeDash = (s) => (s || "").replace(/[\u2010-\u2015\u2212]/g, "-");

function latestSnapshot(category, qid, engine) {
  // A same-day duplicate harvest can leave more than one snapshot for the
  // same qid+engine (a known gap in scripts/harvest.py's resume-skip, not
  // something to paper over here) — a proper 3-way comparator (returning 0
  // on ties, not just 1/-1) keeps the pick deterministic via JS's
  // guaranteed-stable sort, rather than depending on sort-implementation
  // behavior for an invalid comparator.
  return (
    (category?.snapshots || [])
      .filter((s) => s.qid === qid && s.engine === engine)
      .sort((a, b) => (a.collected_on > b.collected_on ? -1 : a.collected_on < b.collected_on ? 1 : 0))[0] || null
  );
}

function buildRows(snapshot) {
  return (snapshot.recommendations || []).map((rec) => {
    const destination = normalizeDash(rec.destination);
    const destinationDomain = normalizeDash(rec.destination_domain);
    const isYou = matches(HERO_BRAND, rec.brand) || matches(HERO_BRAND, rec.product);
    const destKey = effectiveDestination({ ...rec, destination, destination_domain: destinationDomain }, { isYou });
    return {
      rank: rec.rank,
      brand: rec.brand,
      isYou,
      destLabel: destKey !== "none" ? DEST_LABELS[destKey] : null,
      destClass: DEST_CLASS[destKey] || "",
      destDomain: destKey !== "none" ? destinationDomain : "",
    };
  });
}

function buildEngineTab(id, query, snapshot) {
  // Hide the chip rather than fake it (rule 2) — no snapshot, no tab.
  if (!snapshot) return null;
  const rows = buildRows(snapshot);
  const youRow = rows.find((r) => r.isYou);
  const dateLabel =
    id === "claude" ? `LIVE · ${formatDateLabel(snapshot.collected_on)}` : `collected ${formatDateLabel(snapshot.collected_on)}`;
  return {
    id,
    label: ENGINE_LABELS[id],
    query,
    dateLabel,
    rows,
    youAppears: Boolean(youRow),
    bestRank: youRow?.rank ?? null,
  };
}

function buildHeroEngines() {
  const bankCategory = indiaBank.categories.find((c) => c.id === HERO_BANK_CATEGORY_ID);
  const bankQuery = bankCategory?.queries.find((q) => q.qid === HERO_BANK_QID)?.text || "";
  const seedCategory = indiaSeed.categories.find((c) => c.id === HERO_SEED_CATEGORY_ID);
  const seedQuery = seedCategory?.queries?.[0]?.text || "";
  const seedClaudeSnapshot = (seedCategory?.snapshots || []).find((s) => s.engine === "claude") || null;

  const byEngine = {
    chatgpt: buildEngineTab("chatgpt", bankQuery, latestSnapshot(bankCategory, HERO_BANK_QID, "chatgpt")),
    gemini: buildEngineTab("gemini", bankQuery, latestSnapshot(bankCategory, HERO_BANK_QID, "gemini")),
    claude: buildEngineTab("claude", seedQuery, seedClaudeSnapshot),
  };

  return ENGINE_ORDER.map((id) => byEngine[id]).filter(Boolean);
}

const HERO_ENGINES = buildHeroEngines();

export default function Hero() {
  return (
    <header className="hero" id="top-hero">
      <div className="eyebrow">
        <span className="eyebrow-dot" />
        For brands in India · UAE · Saudi Arabia
      </div>
      <h1 className="hero-h1-simple">Does AI recommend your brand — or your competitor?</h1>
      <DomainCheckForm />
      <div className="hero-note mono">
        Free. 2 minutes. See what ChatGPT, Gemini and Claude tell your customers.
      </div>

      {/* product report card mock — tabs + shelf are real snapshot data
          (HERO_ENGINES, computed above); verdict/SOV/engine-badges below
          are the unchanging overall-summary mock, same across every tab */}
      <div className="report-wrap">
        <div className="report-glow" />
        <div className="report-card">
          <HeroReportCard engines={HERO_ENGINES}>
            <div className="report-col-r">
              <div>
                <div className="report-label">Verdict</div>
                <span className="verdict-badge">ON THE SHELF · #1</span>
                <div className="verdict-warn">⚠ but routed to Amazon — you pay commission on every sale</div>
              </div>
              <div>
                <div className="report-label">Share of AI voice</div>
                <div className="sov-bar">
                  <div style={{ width: "24%", background: "var(--tag)" }} />
                  <div style={{ width: "39%", background: "var(--brick2)" }} />
                  <div style={{ width: "37%", background: "var(--chip-bg)" }} />
                </div>
                <div className="sov-legend">
                  <span style={{ color: "var(--link-hover)" }}>■ you 24%</span>
                  <span style={{ color: "var(--brick)" }}>■ marketplaces 39%</span>
                  <span>■ others 37%</span>
                </div>
              </div>
              <div>
                <div className="report-label">AI apps stocking you</div>
                <div className="engine-badges">
                  <span className="engine-badge yes">ChatGPT ✓</span>
                  <span className="engine-badge yes">Gemini ✓</span>
                  <span className="engine-badge yes">Claude ✓</span>
                </div>
              </div>
            </div>
          </HeroReportCard>
        </div>
      </div>
    </header>
  );
}

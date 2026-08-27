import { ENGINE_ORDER, ENGINE_LABELS, matches, effectiveDestination, DEST_LABELS } from "./scoring";
import indiaBank from "@/data/india.json";
import indiaSeed from "@/data/snapshots-india-seed.json";

// Real snapshots only (hard rule 2: never fabricate) — resolved once at
// module load (static JSON imports, no fetch). Shared by components/
// Hero.js (the live report-card demo) and components/ResultExample.js
// (the homepage's "what a result looks like" section) so both read the
// exact same real example, never two independently-typed ones.
export const HERO_BRAND = "Minimalist";
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
const normalizeDash = (s) => (s || "").replace(/[‐-―−]/g, "-");

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
      destKey,
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
    youDestLabel: youRow?.destLabel ?? null,
    youDestKey: youRow?.destKey ?? null,
    youDestDomain: youRow?.destDomain || null,
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

export const HERO_ENGINES = buildHeroEngines();

import fs from "node:fs";
import path from "node:path";
import { mergeBank } from "./bankMerge.js";
import { MARKET_PROFILES, listMarkets as listMarketProfiles } from "./marketProfiles.js";

// Per-market query bank + harvested-snapshot files. See docs/stockedby-data-kit.md
// for the schema and docs/prototype-app.jsx for the format this was ported from.
// UAE and KSA ship their harvested snapshots inline in the bank file itself
// (no separate seed file, unlike India's legacy snapshots-india-seed.json).
// Bank filename is derived from each profile's queryBankKey (market-expansion
// phase) — Oman/Bahrain both resolve to ksa.json via queryBankKey: "KSA",
// their own currency/retailer context still comes from their own profile.
// This map is genuinely just "which file", not market data — that all lives
// in lib/marketProfiles.js now.
const BANK_FILENAME = { India: "india.json", UAE: "uae.json", KSA: "ksa.json", Qatar: "qatar.json", Kuwait: "kuwait.json", Pakistan: "pakistan.json" };
const SEED_FILENAME = { India: "snapshots-india-seed.json" };

function bankFileFor(market) {
  const profile = MARKET_PROFILES[market];
  if (!profile) return null;
  return BANK_FILENAME[profile.queryBankKey] || null;
}

const DATA_DIR = path.join(process.cwd(), "data");

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
}

// Module-level cache: data/*.json only changes on deploy, safe to read once
// per server instance.
const bankCache = new Map();

// includeUnlisted: true is required for Pakistan — it's listed: false (never
// shown in the UI) but still a real, loadable market for an explicit
// ?market=Pakistan/?market=PK link. See lib/marketProfiles.js.
export function listMarkets({ includeUnlisted = false } = {}) {
  return listMarketProfiles({ includeUnlisted });
}

export function loadMarket(market) {
  if (bankCache.has(market)) return bankCache.get(market);

  const bankFile = bankFileFor(market);
  if (!bankFile) return null;

  const bank = readJSON(bankFile);
  const seed = SEED_FILENAME[market] ? readJSON(SEED_FILENAME[market]) : null;
  const merged = mergeBank(bank, seed);
  bankCache.set(market, merged);
  return merged;
}

export function getCategory(market, categoryId) {
  const bank = loadMarket(market);
  if (!bank) return null;
  return bank.categories.find((c) => c.id === categoryId) || null;
}

// The version of the query bank a market's categories/queries currently
// come from — stored on completed test records (app/api/test/route.js) so
// a future refresh (scripts/refresh_query_bank.py) has an audit trail of
// which version produced which report. Null for a market whose bank
// predates versioning ever being introduced (shouldn't happen after this
// pass — every bank file gets version: 1 as part of it).
export function getBankVersion(market) {
  return loadMarket(market)?.version ?? null;
}

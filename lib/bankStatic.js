// Client-safe mirror of lib/bank.js for the category picker UI. data/*.json
// isn't secret (only ANTHROPIC_API_KEY is, per hard rule 1) so it's fine to
// bundle for browsing — the live test itself still only runs server-side.
// Static ES imports (webpack/turbopack needs literal paths, can't derive
// these dynamically from lib/marketProfiles.js the way lib/bank.js's
// fs-based loader can) — one import per DISTINCT bank file, not per
// market: Oman and Bahrain both read ksaBank via their own queryBankKey.
import { mergeBank } from "./bankMerge.js";
import { listMarkets as listMarketProfiles } from "./marketProfiles.js";
import indiaBank from "@/data/india.json";
import indiaSeed from "@/data/snapshots-india-seed.json";
import uaeBank from "@/data/uae.json";
import ksaBank from "@/data/ksa.json";
import qatarBank from "@/data/qatar.json";
import kuwaitBank from "@/data/kuwait.json";
import pakistanBank from "@/data/pakistan.json";

const MARKET_BANKS = {
  India: mergeBank(indiaBank, indiaSeed),
  UAE: mergeBank(uaeBank, null),
  KSA: mergeBank(ksaBank, null),
  Qatar: mergeBank(qatarBank, null),
  Kuwait: mergeBank(kuwaitBank, null),
  Oman: mergeBank(ksaBank, null),
  Bahrain: mergeBank(ksaBank, null),
  Pakistan: mergeBank(pakistanBank, null),
};

// includeUnlisted: true is required for Pakistan — see lib/marketProfiles.js.
export function listMarkets({ includeUnlisted = false } = {}) {
  return listMarketProfiles({ includeUnlisted });
}

export function getMarketCategories(market) {
  return MARKET_BANKS[market]?.categories || [];
}

export function getCategory(market, categoryId) {
  return getMarketCategories(market).find((c) => c.id === categoryId) || null;
}

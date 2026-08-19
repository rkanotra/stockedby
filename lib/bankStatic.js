// Client-safe mirror of lib/bank.js for the category picker UI. data/*.json
// isn't secret (only ANTHROPIC_API_KEY is, per hard rule 1) so it's fine to
// bundle for browsing — the live test itself still only runs server-side.
import { mergeBank } from "./bankMerge";
import indiaBank from "@/data/india.json";
import indiaSeed from "@/data/snapshots-india-seed.json";
import gccBank from "@/data/gcc.json";
import gccSeed from "@/data/snapshots-gcc-seed.json";

const MARKET_BANKS = {
  India: mergeBank(indiaBank, indiaSeed),
  GCC: mergeBank(gccBank, gccSeed),
};

export function listMarkets() {
  return Object.keys(MARKET_BANKS);
}

export function getMarketCategories(market) {
  return MARKET_BANKS[market]?.categories || [];
}

export function getCategory(market, categoryId) {
  return getMarketCategories(market).find((c) => c.id === categoryId) || null;
}

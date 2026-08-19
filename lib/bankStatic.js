// Client-safe mirror of lib/bank.js for the category picker UI. data/*.json
// isn't secret (only ANTHROPIC_API_KEY is, per hard rule 1) so it's fine to
// bundle for browsing — the live test itself still only runs server-side.
import { mergeBank } from "./bankMerge";
import indiaBank from "@/data/india.json";
import indiaSeed from "@/data/snapshots-india-seed.json";
import uaeBank from "@/data/uae.json";
import ksaBank from "@/data/ksa.json";

const MARKET_BANKS = {
  India: mergeBank(indiaBank, indiaSeed),
  UAE: mergeBank(uaeBank, null),
  KSA: mergeBank(ksaBank, null),
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

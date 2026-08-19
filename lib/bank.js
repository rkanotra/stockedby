import fs from "node:fs";
import path from "node:path";
import { mergeBank } from "./bankMerge";

// Per-market query bank + harvested-snapshot files. See docs/stockedby-data-kit.md
// for the schema and docs/prototype-app.jsx for the format this was ported from.
const MARKET_FILES = {
  India: { bank: "india.json", seed: "snapshots-india-seed.json" },
  GCC: { bank: "gcc.json", seed: "snapshots-gcc-seed.json" },
};

const DATA_DIR = path.join(process.cwd(), "data");

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));
}

// Module-level cache: data/*.json only changes on deploy, safe to read once
// per server instance.
const bankCache = new Map();

export function listMarkets() {
  return Object.keys(MARKET_FILES);
}

export function loadMarket(market) {
  if (bankCache.has(market)) return bankCache.get(market);

  const files = MARKET_FILES[market];
  if (!files) return null;

  const bank = readJSON(files.bank);
  const seed = files.seed ? readJSON(files.seed) : null;
  const merged = mergeBank(bank, seed);
  bankCache.set(market, merged);
  return merged;
}

export function getCategory(market, categoryId) {
  const bank = loadMarket(market);
  if (!bank) return null;
  return bank.categories.find((c) => c.id === categoryId) || null;
}

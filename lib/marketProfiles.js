// The single source of truth for every market's country/currency/language/
// retailer configuration (CLAUDE.md market-expansion phase). Before this
// file existed, this data was hardcoded and duplicated across lib/scoring.js
// (RIVALS/RIVAL_LABELS/MARKET_LABELS/MARKET_LOCALE/KNOWN_MARKETPLACE_ROOTS),
// lib/bank.js and lib/bankStatic.js (two independently-hardcoded market ->
// bank-file maps), and components/test/MarketStep.js (its own local
// per-market subtext map, which would silently render blank for any new
// market key not added there too — a real bug this file fixes by giving
// every consumer ONE place to look up a market's data).
//
// Market KEY design: kept the EXISTING style ("India"/"UAE"/"KSA") as the
// canonical identifier, since that's what's already persisted in Supabase's
// `reports.market` column, data/*.json's own "market" field, and every
// existing /test?market=... URL. Renaming these to ISO codes would be a
// breaking migration of already-live production data for zero benefit. New
// markets get keys in the same style ("Qatar"/"Kuwait"/"Oman"/"Bahrain"/
// "Pakistan") — `countryCode` is a FIELD inside each profile (used for
// TLD-guessing and any future external API calls that need an ISO code),
// never the lookup key itself.
//
// `priceBands` is deliberately NOT a field here — it's generation-time
// reference data (real local price points researched while writing each
// bank's category-discovery queries, per docs/stockedby-data-kit.md §2b),
// not something the running app reads at request time. Nothing in this
// file is read as `market === "..."` — every consumer looks a market up as
// an object key, matching the pattern lib/scoring.js's computeReport()
// already used before this refactor.
export const MARKET_PROFILES = {
  India: {
    countryCode: "IN",
    countryName: "India",
    currency: "INR",
    currencySymbol: "₹",
    currencyLabel: "INR (₹)",
    primaryLanguages: ["en", "hi-Latn"],
    defaultLanguage: "en",
    languageCode: "hi-en",
    languageLabel: "Hinglish",
    marketLine: "Shoppers ask in English and Hinglish.",
    marketplaces: ["amazon.in", "flipkart.com"],
    retailersByCategory: {
      beauty: ["nykaa.com", "purplle.com", "tirabeauty.com", "myntra.com"],
      quick: ["blinkit.com"],
    },
    rivalNames: ["amazon", "flipkart", "meesho", "myntra", "nykaa"],
    rivalLabel: "Flipkart/Amazon",
    queryBankKey: "India",
    coverageLevel: "full",
    listed: true,
    tld: ".in",
  },
  UAE: {
    countryCode: "AE",
    countryName: "UAE",
    currency: "AED",
    currencySymbol: "AED",
    currencyLabel: "AED",
    primaryLanguages: ["en", "ar"],
    defaultLanguage: "en",
    languageCode: "ar",
    languageLabel: "Gulf Arabic",
    marketLine: "Shoppers ask in English and Arabic.",
    marketplaces: ["noon.com", "amazon.ae", "carrefouruae.com"],
    retailersByCategory: { beauty: ["namshi.com"] },
    rivalNames: ["amazon", "noon", "namshi", "carrefour"],
    rivalLabel: "Noon/Amazon",
    queryBankKey: "UAE",
    coverageLevel: "full",
    listed: true,
    tld: ".ae",
  },
  KSA: {
    countryCode: "SA",
    countryName: "Saudi Arabia",
    currency: "SAR",
    currencySymbol: "SAR",
    currencyLabel: "SAR",
    primaryLanguages: ["ar", "en"],
    defaultLanguage: "ar",
    languageCode: "ar",
    languageLabel: "Saudi-dialect Arabic",
    marketLine: "Shoppers ask in English and Arabic.",
    marketplaces: ["noon.com", "amazon.sa"],
    retailersByCategory: { general: ["jarir.com", "extra.com"] },
    rivalNames: ["amazon", "noon", "jarir", "extra"],
    rivalLabel: "Amazon/Jarir",
    queryBankKey: "KSA",
    coverageLevel: "full",
    listed: true,
    tld: ".sa",
  },
  Qatar: {
    countryCode: "QA",
    countryName: "Qatar",
    currency: "QAR",
    currencySymbol: "QAR",
    currencyLabel: "QAR",
    primaryLanguages: ["ar", "en"],
    defaultLanguage: "ar",
    languageCode: "ar",
    languageLabel: "Gulf Arabic",
    marketLine: "Shoppers ask in English and Arabic.",
    // Amazon has no dedicated Qatar storefront — shoppers use amazon.ae
    // cross-border (that's already covered by isAmazonDomain()'s generic
    // amazon.* match, so it isn't listed here — see lib/scoring.js).
    marketplaces: ["noon.com", "carrefourqatar.com"],
    retailersByCategory: {
      beauty: ["boutiqaat.com", "qt.boots.com", "sephora.me"],
      quick: ["snoonu.com", "talabat.com"],
    },
    rivalNames: ["noon", "carrefour", "boutiqaat"],
    rivalLabel: "Noon/Boutiqaat",
    queryBankKey: "Qatar",
    coverageLevel: "full",
    listed: true,
    tld: ".qa",
  },
  Kuwait: {
    countryCode: "KW",
    countryName: "Kuwait",
    currency: "KWD",
    currencySymbol: "KWD",
    currencyLabel: "KWD",
    primaryLanguages: ["ar", "en"],
    defaultLanguage: "ar",
    languageCode: "ar",
    languageLabel: "Gulf Arabic",
    marketLine: "Shoppers ask in English and Arabic.",
    // No dedicated Amazon storefront here either — cross-border amazon.ae
    // is covered generically, not listed per-market (see Qatar's comment).
    marketplaces: ["noon.com"],
    retailersByCategory: {
      beauty: ["boutiqaat.com", "kw.boots.com", "sephora.me"],
      // X-cite is electronics-only — must never surface as a suggested
      // source for a beauty-category recommendation. This is exactly why
      // retailersByCategory is a per-category map, not a flat list.
      electronics: ["xcite.com"],
      quick: ["talabat.com"],
    },
    rivalNames: ["noon", "boutiqaat", "xcite"],
    rivalLabel: "Noon/Boutiqaat",
    queryBankKey: "Kuwait",
    coverageLevel: "full",
    listed: true,
    tld: ".kw",
  },
  // Oman and Bahrain inherit KSA's query bank (queryBankKey: "KSA") —
  // their own profile still supplies real currency/marketplace context, so
  // a report for these markets never shows SAR prices or Saudi retailer
  // names. needsVerification: true on both — [RESEARCH] flags from the
  // market-expansion brief, not yet founder-confirmed. Do not remove
  // needsVerification without an explicit founder sign-off.
  Oman: {
    countryCode: "OM",
    countryName: "Oman",
    currency: "OMR",
    currencySymbol: "OMR",
    currencyLabel: "OMR",
    primaryLanguages: ["ar", "en"],
    defaultLanguage: "ar",
    languageCode: "ar",
    languageLabel: "Gulf Arabic",
    marketLine: "Shoppers ask in English and Arabic.",
    marketplaces: ["noon.com"],
    retailersByCategory: {},
    rivalNames: ["noon"],
    rivalLabel: "Noon",
    queryBankKey: "KSA",
    coverageLevel: "inherited",
    listed: true,
    tld: ".om",
    needsVerification: true,
    verificationNote: "Local retailer list unverified beyond Noon (cross-border delivery) — confirm before treating as complete.",
  },
  Bahrain: {
    countryCode: "BH",
    countryName: "Bahrain",
    currency: "BHD",
    currencySymbol: "BHD",
    currencyLabel: "BHD",
    primaryLanguages: ["ar", "en"],
    defaultLanguage: "ar",
    languageCode: "ar",
    languageLabel: "Gulf Arabic",
    marketLine: "Shoppers ask in English and Arabic.",
    // Thin market, largely served cross-border via amazon.ae (covered by
    // the generic amazon.* match) — deliberately no local marketplace list
    // here until verified, per the brief's own note.
    marketplaces: [],
    retailersByCategory: {},
    rivalNames: [],
    rivalLabel: "Amazon (cross-border)",
    queryBankKey: "KSA",
    coverageLevel: "inherited",
    listed: true,
    tld: ".bh",
    needsVerification: true,
    verificationNote: "Thin market, largely served cross-border via amazon.ae — no local retailer list populated yet, verify before go-live.",
  },
  // Pakistan: full bank, but listed: false — accepted via an explicit
  // ?market=Pakistan (or ?market=PK) URL, never rendered in the picker,
  // never mentioned in copy/meta tags/sitemap. See listMarkets() below.
  Pakistan: {
    countryCode: "PK",
    countryName: "Pakistan",
    currency: "PKR",
    currencySymbol: "PKR",
    currencyLabel: "PKR",
    primaryLanguages: ["ur", "en"],
    defaultLanguage: "ur",
    languageCode: "ur-en",
    languageLabel: "Roman Urdu",
    marketLine: "Shoppers ask in English and Urdu.",
    marketplaces: ["daraz.pk"],
    retailersByCategory: {},
    rivalNames: ["daraz"],
    rivalLabel: "Daraz",
    queryBankKey: "Pakistan",
    coverageLevel: "full",
    listed: false,
    tld: ".pk",
    needsVerification: true,
    verificationNote: "Beauty-vertical retailers beyond Daraz unverified — confirm before treating the category set as complete.",
  },
};

// Every profile with listed: true, in MARKET_PROFILES's own key order —
// this is what components/test/MarketStep.js's picker renders. Pass
// includeUnlisted: true to also get Pakistan back (used only for URL-param
// validation, e.g. components/test/TestFlow.js's returnContextFromParams
// and app/api/test/route.js — a returning Pakistan merchant's saved link
// must keep working even though Pakistan is never shown in the UI).
export function listMarkets({ includeUnlisted = false } = {}) {
  return Object.keys(MARKET_PROFILES).filter((m) => includeUnlisted || MARKET_PROFILES[m].listed);
}

export function getMarketProfile(market) {
  return MARKET_PROFILES[market] || null;
}

// TLD-only market guess for a merchant-entered domain — never guesses from
// .com or any TLD not explicitly mapped, per the brief's "never infer from
// .com" rule. Used to pre-fill a hint above MarketStep.js's picker, never
// to silently auto-advance past it (the merchant always sees and can
// change the pick).
export function guessMarketFromDomain(domain) {
  const d = (domain || "").toLowerCase().trim();
  if (!d) return null;
  for (const [market, profile] of Object.entries(MARKET_PROFILES)) {
    if (profile.tld && d.endsWith(profile.tld)) return market;
  }
  return null;
}

// Resolves either the canonical market key ("Pakistan") or, as a
// convenience alias, a profile's countryCode case-insensitively ("PK") —
// satisfies the brief's own "?market=PK" example while every other market
// keeps using its existing full-name URL param convention.
export function resolveMarketParam(param, { includeUnlisted = false } = {}) {
  if (!param) return null;
  const candidates = listMarkets({ includeUnlisted });
  if (candidates.includes(param)) return param;
  const upper = param.toUpperCase();
  const byCode = candidates.find((m) => MARKET_PROFILES[m].countryCode === upper);
  return byCode || null;
}

// Flattens every profile's marketplaces[] + retailersByCategory{} values
// into one deduped list of known 3rd-party retailer/marketplace domains —
// replaces lib/scoring.js's old flat, hardcoded KNOWN_MARKETPLACE_ROOTS.
// Category-agnostic on purpose: this list only answers "is this domain a
// recognized 3rd-party retailer at all" for destination-classification
// overrides, which never needed per-category scoping (X-cite's
// electronics-only scoping matters for future retailer-SUGGESTION
// features, not for classifying a destination that already happened).
export function allMarketplaceDomains() {
  const set = new Set();
  Object.values(MARKET_PROFILES).forEach((p) => {
    (p.marketplaces || []).forEach((d) => set.add(d));
    Object.values(p.retailersByCategory || {}).forEach((domains) => (domains || []).forEach((d) => set.add(d)));
  });
  return [...set];
}

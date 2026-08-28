import { listMarkets, getMarketProfile } from "@/lib/marketProfiles";

// Per-market marketing copy — kept here, not in lib/marketProfiles.js,
// since that file holds structured retailer/currency data the app reads
// at request time, not written prose. Every listed market (India/UAE/
// Saudi Arabia/Qatar/Kuwait/Oman/Bahrain) gets a card automatically —
// adding a market to lib/marketProfiles.js is enough, no second place to
// remember to update. Pakistan never appears here (listed: false).
const MARKET_COPY = {
  India: { vs: "vs Flipkart · Amazon.in · Meesho · Nykaa", line: "Hinglish queries, ₹ budgets, festive and wedding-season intent. 100 categories live." },
  UAE: { vs: "vs Noon · Amazon.ae · Namshi · Carrefour", line: "Gulf Arabic queries, oud, abayas, attar and the categories where local brands already beat marketplaces." },
  KSA: { vs: "vs Amazon.sa · Jarir · Noon · Extra", line: "Saudi-dialect Arabic queries across oud, abayas and modest fashion, plus Ramadan and Hajj-season gifting spikes." },
  Qatar: { vs: "vs Noon · Boutiqaat · Carrefour Qatar", line: "Gulf Arabic queries, QAR budgets, and the beauty/quick-commerce apps (Boutiqaat, Snoonu, Talabat) shoppers actually use." },
  Kuwait: { vs: "vs Noon · Boutiqaat · X-cite", line: "Gulf Arabic queries, KWD budgets, and category-specific retailers (X-cite for electronics, Boutiqaat for beauty) instead of one generic marketplace list." },
  Oman: { vs: "vs Noon", line: "Saudi Arabic-dialect query bank with Omani currency and retailer context — a real starting bank, not a full localization yet." },
  Bahrain: { vs: "cross-border via Amazon.ae", line: "Saudi Arabic-dialect query bank with Bahraini currency context — a thin market served largely cross-border today." },
};

export default function Markets() {
  const markets = listMarkets();
  return (
    <section id="markets" className="wrap aisle">
      <div className="aisle-head rv"><h2>AI shopping visibility, market by market</h2></div>
      <p className="aisle-sub rv">
        A ₹700 skincare question and a QAR 100 skincare question aren&rsquo;t the same test. We adapt to
        how people actually shop in each market.
      </p>
      <div className="aisle-plank rv" />
      <div className="grid">
        {markets.map((m) => {
          const profile = getMarketProfile(m);
          const copy = MARKET_COPY[m];
          if (!profile || !copy) return null;
          return (
            <div className="mkt rv" key={m}>
              <h3>{profile.countryName}</h3>
              <div className="vs mono">{copy.vs}</div>
              <p>{copy.line}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

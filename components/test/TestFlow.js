"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./test.module.css";
import { listMarkets, getMarketCategories, getCategory } from "@/lib/bankStatic";
import { effectiveQueryText } from "@/lib/queryPersonalize";
import SetupPanel from "./SetupPanel";
import ReadyPanel from "./ReadyPanel";
import RunningPanel from "./RunningPanel";
import ReportView from "./report/ReportView";

const MARKETS = listMarkets();

export default function TestFlow() {
  const [market, setMarket] = useState(MARKETS[0]);
  const [catSearch, setCatSearch] = useState("");
  const [catId, setCatId] = useState("");
  const [brand, setBrand] = useState("");
  const [website, setWebsite] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [queries, setQueries] = useState([]);
  const [phase, setPhase] = useState("setup"); // setup | ready | running | done
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState("");

  const categories = getMarketCategories(market);
  const category = getCategory(market, catId);

  function pickMarket(m) {
    setMarket(m);
    setCatId("");
    setCatSearch("");
  }

  function pickCategory(id) {
    const c = getCategory(market, id);
    if (!c) return;
    setCatId(id);
    // originalText is the immutable bank template a branded-routing query
    // gets personalized from on every brand-field keystroke; userEdited
    // freezes that once the merchant types into the textarea themselves.
    setQueries((c.queries || []).map((q) => ({ ...q, originalText: q.text, userEdited: false })));
    setPhase("ready");
    setResult(null);
    setRunError("");
  }

  function setQueryText(qid, text) {
    setQueries((prev) => prev.map((q) => (q.qid === qid ? { ...q, text, userEdited: true } : q)));
  }

  async function startTest() {
    if (!brand.trim() || queries.length === 0) return;
    setPhase("running");
    setRunError("");
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market,
          categoryId: catId,
          brand: brand.trim(),
          competitor: competitor.trim(),
          brandWebsite: website.trim(),
          queries: queries.map((q) => ({ qid: q.qid, text: effectiveQueryText(q, brand) })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRunError(data.error || "Something went wrong. Please try again.");
        setPhase("ready");
        return;
      }
      setResult(data);
      setPhase("done");
    } catch {
      setRunError("Network error — please try again.");
      setPhase("ready");
    }
  }

  function testAnother() {
    setPhase("setup");
    setResult(null);
    setRunError("");
  }

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.topNav}>
          <Link href="/" className={styles.logo}>
            stocked<b>by</b>
          </Link>
        </div>
        <div className={styles.mark}>StockedBy · {market} · 6 engines</div>
        <h1 className={styles.title}>Does AI put you on the shelf?</h1>
        <p className={styles.sub}>
          Pick your category, enter your brand, and see who Claude — live — and ChatGPT, Gemini, Grok,
          Perplexity and Copilot from harvested data recommend, and where they send the buyer to check out.
        </p>

        {phase === "setup" && (
          <SetupPanel
            markets={MARKETS}
            market={market}
            onMarket={pickMarket}
            categories={categories}
            search={catSearch}
            onSearch={setCatSearch}
            onPick={pickCategory}
          />
        )}

        {phase === "ready" && category && (
          <ReadyPanel
            category={category}
            brand={brand}
            onBrand={setBrand}
            website={website}
            onWebsite={setWebsite}
            competitor={competitor}
            onCompetitor={setCompetitor}
            queries={queries}
            onQueryText={setQueryText}
            onStart={startTest}
            onBack={() => setPhase("setup")}
            error={runError}
          />
        )}

        {phase === "running" && (
          <RunningPanel queries={queries.map((q) => ({ ...q, text: effectiveQueryText(q, brand) }))} />
        )}

        {phase === "done" && result && (
          <>
            <ReportView data={result} onRetry={startTest} />
            <button type="button" className={styles.btnGhost} onClick={testAnother}>
              Test another category
            </button>
          </>
        )}
      </div>
    </div>
  );
}

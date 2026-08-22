"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./test.module.css";
import { listMarkets, getMarketCategories, getCategory } from "@/lib/bankStatic";
import { effectiveQueryText } from "@/lib/queryPersonalize";
import { staleEnginesFor } from "@/lib/freshness";
import { ENGINE_ORDER } from "@/lib/scoring";
import SetupPanel from "./SetupPanel";
import CustomCategoryPanel from "./CustomCategoryPanel";
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
  // setup | custom-brand | ready | running | done
  const [phase, setPhase] = useState("setup");
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState("");

  // Custom-category flow (search had no bank match): customCategoryName is
  // the merchant's typed category; isCustom marks the currently-loaded
  // `queries` as Claude-generated rather than from the bank, so ReadyPanel/
  // startTest/the report all know to treat this run differently.
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const categories = getMarketCategories(market);
  const bankCategory = getCategory(market, catId);
  const category = isCustom ? { name: customCategoryName } : bankCategory;
  // Best-effort pre-run hint for RunningPanel — see its own comment on why
  // this can't be a guarantee of what the server will actually harvest. A
  // custom `category` here has no `snapshots` at all, so staleEnginesFor
  // (via its own `category?.snapshots || []` guard) naturally reports every
  // non-claude engine as stale — matches what the server will attempt.
  const harvestingEngines = category
    ? staleEnginesFor(category, ENGINE_ORDER.filter((e) => e !== "claude"))
    : [];

  function pickMarket(m) {
    setMarket(m);
    setCatId("");
    setCatSearch("");
  }

  function backToSetup() {
    setPhase("setup");
    setIsCustom(false);
    setCustomCategoryName("");
    setGenError("");
  }

  function pickCategory(id) {
    const c = getCategory(market, id);
    if (!c) return;
    setCatId(id);
    setIsCustom(false);
    setCustomCategoryName("");
    // originalText is the immutable bank template a branded-routing query
    // gets personalized from on every brand-field keystroke; userEdited
    // freezes that once the merchant types into the textarea themselves.
    setQueries((c.queries || []).map((q) => ({ ...q, originalText: q.text, userEdited: false })));
    setPhase("ready");
    setResult(null);
    setRunError("");
  }

  function pickCustomCategory(name) {
    setCustomCategoryName(name);
    setCatId("");
    setGenError("");
    setPhase("custom-brand");
  }

  async function generateCustom() {
    if (!brand.trim() || generating) return;
    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch("/api/generate-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, categoryName: customCategoryName, brand: brand.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Couldn't generate questions. Please try again.");
        return;
      }
      // Custom queries arrive already personalized to the merchant's brand
      // (no leader_brand to substitute) — originalText/userEdited still
      // matter so the textarea's onChange tracking works the same as bank
      // queries.
      setQueries(data.queries.map((q) => ({ ...q, originalText: q.text, userEdited: false })));
      setIsCustom(true);
      setResult(null);
      setRunError("");
      setPhase("ready");
    } catch {
      setGenError("Network error — please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function setQueryText(qid, text) {
    setQueries((prev) => prev.map((q) => (q.qid === qid ? { ...q, text, userEdited: true } : q)));
  }

  async function startTest() {
    if (!brand.trim() || queries.length === 0) return;
    setPhase("running");
    setRunError("");
    try {
      const payload = {
        market,
        brand: brand.trim(),
        competitor: competitor.trim(),
        brandWebsite: website.trim(),
      };
      if (isCustom) {
        // Custom queries ARE the category definition — nothing to look up
        // or override server-side, and nothing gets written into data/*.json.
        payload.customCategory = {
          name: customCategoryName,
          queries: queries.map((q) => ({
            qid: q.qid,
            text: effectiveQueryText(q, brand),
            archetype: q.archetype,
            language: q.language,
          })),
        };
      } else {
        payload.categoryId = catId;
        payload.queries = queries.map((q) => ({ qid: q.qid, text: effectiveQueryText(q, brand) }));
      }
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    setIsCustom(false);
    setCustomCategoryName("");
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
        <div className={styles.mark}>StockedBy · {market} · 3 engines</div>
        <h1 className={styles.title}>Does AI put you on the shelf?</h1>
        <p className={styles.sub}>
          Pick your category, enter your brand, and see who ChatGPT, Gemini and Claude
          recommend — kept current automatically, never a stale test — and where they send the
          buyer to check out.
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
            onCustomPick={pickCustomCategory}
          />
        )}

        {phase === "custom-brand" && (
          <CustomCategoryPanel
            categoryName={customCategoryName}
            market={market}
            brand={brand}
            onBrand={setBrand}
            onGenerate={generateCustom}
            onBack={backToSetup}
            generating={generating}
            error={genError}
          />
        )}

        {phase === "ready" && category && (
          <ReadyPanel
            category={category}
            isCustom={isCustom}
            brand={brand}
            onBrand={setBrand}
            website={website}
            onWebsite={setWebsite}
            competitor={competitor}
            onCompetitor={setCompetitor}
            queries={queries}
            onQueryText={setQueryText}
            onStart={startTest}
            onBack={backToSetup}
            error={runError}
          />
        )}

        {phase === "running" && (
          <RunningPanel
            queries={queries.map((q) => ({ ...q, text: effectiveQueryText(q, brand) }))}
            harvestingEngines={harvestingEngines}
          />
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

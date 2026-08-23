"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./test.module.css";
import { listMarkets, getMarketCategories, getCategory } from "@/lib/bankStatic";
import { effectiveQueryText } from "@/lib/queryPersonalize";
import { staleEnginesFor } from "@/lib/freshness";
import { ENGINE_ORDER, guessBrandFromDomain, safeDecode } from "@/lib/scoring";
import { runAllQueries } from "@/lib/runQueries";
import DomainStep from "./DomainStep";
import BrandStep from "./BrandStep";
import MarketStep from "./MarketStep";
import CategoryStep from "./CategoryStep";
import QueryStep from "./QueryStep";
import RunningPanel from "./RunningPanel";
import ReportView from "./report/ReportView";

const MARKETS = listMarkets();

// Domain-first step wizard, one decision per screen:
// domain -> brand -> market -> category -> (generating, only for a custom
// category) -> queries -> running -> done. Brand/website are collected
// once, up front — "website" IS the domain here (no separate field), and
// there's no competitor field at all (dropped for this simplified flow;
// the report/API still support one, this wizard just never asks).
export default function TestFlow() {
  const searchParams = useSearchParams();

  const [domain, setDomain] = useState(() => safeDecode(searchParams.get("domain") || ""));
  const [brand, setBrand] = useState("");
  const [market, setMarket] = useState(MARKETS[0]);
  const [catSearch, setCatSearch] = useState("");
  const [catId, setCatId] = useState("");
  const [queries, setQueries] = useState([]);
  // domain | brand | market | category | generating | queries | running | retrying | done
  const [phase, setPhase] = useState("domain");
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState("");
  // qid -> "searching" | "done" | "error", live per-question progress —
  // each question is now its own request (lib/runQueries.js), so this can
  // reflect real per-question completion instead of one shared state for
  // the whole batch. Also drives "retrying" phase's running list, scoped
  // to just the question(s) actually being retried.
  const [liveStatus, setLiveStatus] = useState({});

  // Custom-category flow (search had no bank match): brand is already known
  // by the time this can happen (collected in the "brand" step, before
  // "category"), so unlike the old flow there's no separate brand-collection
  // screen — picking a custom category goes straight to generating.
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [genError, setGenError] = useState("");

  const categories = getMarketCategories(market);
  const bankCategory = getCategory(market, catId);
  const category = isCustom ? { name: customCategoryName } : bankCategory;
  // Best-effort pre-run hint for RunningPanel — see its own comment on why
  // this can't be a guarantee of what the server will actually harvest.
  const harvestingEngines = category
    ? staleEnginesFor(category, ENGINE_ORDER.filter((e) => e !== "claude"))
    : [];

  function goToBrand() {
    if (!domain.trim()) return;
    if (!brand.trim()) setBrand(guessBrandFromDomain(domain));
    setPhase("brand");
  }

  function pickMarket(m) {
    setMarket(m);
    setCatId("");
    setCatSearch("");
    setPhase("category");
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
    setPhase("queries");
    setResult(null);
    setRunError("");
  }

  async function pickCustomCategory(name) {
    setCustomCategoryName(name);
    setCatId("");
    setGenError("");
    setPhase("generating");
    try {
      const res = await fetch("/api/generate-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market, categoryName: name, brand: brand.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenError(data.error || "Couldn't write questions. Please try again.");
        setPhase("category");
        return;
      }
      setQueries(data.queries.map((q) => ({ ...q, originalText: q.text, userEdited: false })));
      setIsCustom(true);
      setResult(null);
      setRunError("");
      setPhase("queries");
    } catch {
      setGenError("Network error — please try again.");
      setPhase("category");
    }
  }

  function setQueryText(qid, text) {
    setQueries((prev) => prev.map((q) => (q.qid === qid ? { ...q, text, userEdited: true } : q)));
  }

  // Runs a batch of questions (all of them for a fresh test, or just the
  // failed ones for a retry — see retryFailedQuestions), each as its own
  // request via lib/runQueries.js, with live per-question status feeding
  // liveStatus for RunningPanel. Returns the resolved rows.
  async function runQuestions(finalQueries) {
    setLiveStatus(Object.fromEntries(finalQueries.map((q) => [q.qid, "searching"])));
    return runAllQueries(finalQueries, (qid, status) =>
      setLiveStatus((prev) => ({ ...prev, [qid]: status }))
    );
  }

  // Submits liveRuns (already collected via runQuestions) to /api/test for
  // scoring, harvest, sentiment and persistence — shared by both a fresh
  // run and a retry, since both ultimately need the same server-side work
  // re-done over a (possibly partially updated) set of question results.
  async function submitLiveRuns(liveRuns) {
    const payload = {
      market,
      brand: brand.trim(),
      competitor: "",
      brandWebsite: domain.trim(),
      liveRuns,
    };
    if (isCustom) {
      // Custom queries ARE the category definition — nothing to look up
      // or override server-side, and nothing gets written into data/*.json.
      payload.customCategory = {
        name: customCategoryName,
        queries: liveRuns.map((r) => ({
          qid: r.qid,
          text: r.text,
          archetype: r.archetype,
          language: queries.find((q) => q.qid === r.qid)?.language || "en",
        })),
      };
    } else {
      payload.categoryId = catId;
      payload.queries = liveRuns.map((r) => ({ qid: r.qid, text: r.text }));
    }
    const res = await fetch("/api/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
    return data;
  }

  async function startTest() {
    if (!brand.trim() || queries.length === 0) return;
    setPhase("running");
    setRunError("");
    try {
      const finalQueries = queries.map((q) => ({
        qid: q.qid,
        text: effectiveQueryText(q, brand),
        archetype: q.archetype,
      }));
      const liveRuns = await runQuestions(finalQueries);
      const data = await submitLiveRuns(liveRuns);
      setResult(data);
      setPhase("done");
    } catch (e) {
      setRunError(e?.message || "Network error — please try again.");
      setPhase("queries");
    }
  }

  // The report's "Retry" button (components/test/report/VerdictCard.js)
  // calls this with report.appearanceSummary.failedQueries — re-runs ONLY
  // those questions (each its own request, with its own retry, same as a
  // fresh test), merges the new results into the already-good ones from
  // `result.liveRuns`, and resubmits the full set so the report reflects
  // the fix. A question that succeeds elsewhere is never re-fetched.
  async function retryFailedQuestions(failedQueries) {
    if (!result || !Array.isArray(failedQueries) || failedQueries.length === 0) return;
    setPhase("retrying");
    setRunError("");
    try {
      const updates = await runQuestions(failedQueries);
      const updatesByQid = new Map(updates.map((u) => [u.qid, u]));
      const mergedLiveRuns = result.liveRuns.map((r) => updatesByQid.get(r.qid) || r);
      const data = await submitLiveRuns(mergedLiveRuns);
      setResult(data);
      setPhase("done");
    } catch (e) {
      setRunError(e?.message || "Network error — please try again.");
      setPhase("done");
    }
  }

  function testAnother() {
    setPhase("domain");
    setIsCustom(false);
    setCustomCategoryName("");
    setResult(null);
    setRunError("");
    setLiveStatus({});
  }

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.topNav}>
          <Link href="/" className={styles.logo}>
            stocked<b>by</b>
          </Link>
        </div>
        <div className={styles.mark}>StockedBy · {market}</div>
        <p className={styles.sub}>
          Your customers ask ChatGPT what to buy. See if it says your name — or your competitor&rsquo;s.
        </p>

        {phase === "domain" && <DomainStep domain={domain} onDomain={setDomain} onNext={goToBrand} />}

        {phase === "brand" && (
          <BrandStep brand={brand} onBrand={setBrand} onNext={() => setPhase("market")} onBack={() => setPhase("domain")} />
        )}

        {phase === "market" && <MarketStep markets={MARKETS} onPick={pickMarket} onBack={() => setPhase("brand")} />}

        {phase === "category" && (
          <CategoryStep
            categories={categories}
            search={catSearch}
            onSearch={setCatSearch}
            onPick={pickCategory}
            onCustomPick={pickCustomCategory}
            onBack={() => setPhase("market")}
          />
        )}

        {phase === "generating" && (
          <div className={styles.card}>
            <span className={styles.label}>Writing your questions…</span>
            <p className={styles.hint} style={{ marginTop: 0 }}>
              This takes a few seconds.
            </p>
          </div>
        )}

        {phase === "queries" && category && (
          <QueryStep
            categoryName={category.name}
            isCustom={isCustom}
            brand={brand}
            queries={queries}
            onQueryText={setQueryText}
            onStart={startTest}
            onBack={() => setPhase("category")}
            error={runError || genError}
          />
        )}

        {phase === "running" && (
          <RunningPanel
            queries={queries.map((q) => ({ ...q, text: effectiveQueryText(q, brand) }))}
            harvestingEngines={harvestingEngines}
            liveStatus={liveStatus}
          />
        )}

        {phase === "retrying" && (
          <RunningPanel
            queries={queries
              .filter((q) => q.qid in liveStatus)
              .map((q) => ({ ...q, text: effectiveQueryText(q, brand) }))}
            liveStatus={liveStatus}
            label={`Rechecking ${Object.keys(liveStatus).length} question${
              Object.keys(liveStatus).length === 1 ? "" : "s"
            }…`}
          />
        )}

        {phase === "done" && result && (
          <>
            <ReportView data={result} onRetry={retryFailedQuestions} />
            <button type="button" className={styles.btnGhost} onClick={testAnother}>
              Test another product
            </button>
          </>
        )}
      </div>
    </div>
  );
}

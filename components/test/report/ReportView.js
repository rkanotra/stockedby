"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../test.module.css";
import { buildFounderReport } from "@/lib/founderReport";
import AIVisibilityHero from "./AIVisibilityHero";
import BiggestOpportunityCard from "./BiggestOpportunityCard";
import BuyerJourney from "./BuyerJourney";
import TestAnotherCTA from "./TestAnotherCTA";
import EngineTabs from "./EngineTabs";
import CompetitorThreat from "./CompetitorThreat";
import DestinationSummary from "./DestinationSummary";
import VisibilityHistoryCard from "./VisibilityHistoryCard";
import RecommendedActions from "./RecommendedActions";
import NextMoveCTA from "./NextMoveCTA";
import VerdictCard from "./VerdictCard";
import LeadGate from "./LeadGate";
import ShareButton from "./ShareButton";
import CheckoutBattleCard from "./CheckoutBattleCard";
import ShareOfVoiceCard from "./ShareOfVoiceCard";
import SentimentCard from "./SentimentCard";
import ShelvesCard from "./ShelvesCard";
import FanoutCard from "./FanoutCard";
import TrustedSourcesCard from "./TrustedSourcesCard";
import AuditCTA from "./AuditCTA";
import FixPlanCTA from "./FixPlanCTA";
import DownloadPdfButton from "./DownloadPdfButton";

// Founder-first redesign (CLAUDE.md's redesign phase): conclusion first
// (AIVisibilityHero + BiggestOpportunityCard + BuyerJourney, all free —
// this is the report's real substance, not a teaser), then the email
// gate, then the "how/who/where" detail (EngineTabs, CompetitorThreat,
// DestinationSummary, RecommendedActions), then a single "View full
// evidence" disclosure wrapping every existing raw-data card
// (VerdictCard/ShelvesCard/CheckoutBattleCard/ShareOfVoiceCard/
// SentimentCard/TrustedSourcesCard/FanoutCard) unchanged — technical
// detail stays fully available, just no longer the default view.
// lib/founderReport.js's buildFounderReport() is the single source for
// every number this page shows; the merchant email and PDF read the same
// function, so the three surfaces can never disagree (hard rule per the
// redesign brief).
export default function ReportView({ data, onRetry, initialShowFull = false }) {
  const [showEvidence, setShowEvidence] = useState(initialShowFull);
  const evidenceRef = useRef(null);
  const [userExpanded, setUserExpanded] = useState(false);

  function scrollToEvidence() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        evidenceRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function handleSeeFix() {
    setUserExpanded(true);
    setShowEvidence(true);
    scrollToEvidence();
  }

  useEffect(() => {
    if (showEvidence && userExpanded) scrollToEvidence();
  }, [showEvidence, userExpanded]);

  const {
    market,
    brand,
    competitor,
    brandWebsite,
    category,
    isCustom,
    report,
    sentiment,
    mentionCount,
    engines,
    fanout,
    trustedSources,
    slug,
  } = data;

  const founder = buildFounderReport({ report, engines, brand });

  return (
    <>
      {isCustom && (
        <div className={styles.customNote}>
          Custom category — standardized benchmark not available, so these scores aren&rsquo;t
          comparable across brands the way a bank-category test is.
        </div>
      )}

      <AIVisibilityHero
        brand={brand}
        report={report}
        visibility={founder.visibility}
        buyerJourney={founder.buyerJourney}
        biggestOpportunity={founder.biggestOpportunity}
        competitorThreat={founder.competitorThreat}
      />

      <BiggestOpportunityCard opportunity={founder.biggestOpportunity} onSeeFix={handleSeeFix} />

      <BuyerJourney buyerJourney={founder.buyerJourney} />

      {category?.name && (
        <TestAnotherCTA categoryName={category.name} brand={brand} brandWebsite={brandWebsite} market={market} />
      )}

      <LeadGate
        market={market}
        category={category?.name}
        brand={brand}
        brandWebsite={brandWebsite}
        verdict={report.verdict}
        slug={slug}
        onUnlock={scrollToEvidence}
        report={report}
        engines={engines}
        sentiment={sentiment}
        trustedSources={trustedSources}
        competitor={competitor}
        mentionCount={mentionCount}
      >
        <EngineTabs brand={brand} engines={engines} />
        <CompetitorThreat competitorThreat={founder.competitorThreat} />
        <DestinationSummary
          brand={brand}
          destinationSplit={founder.destinationSplit}
          destinationSplitByEngine={founder.destinationSplitByEngine}
          yourDestinations={report.destinations?.yourDestinations}
        />
        {!isCustom && category?.id && (
          <VisibilityHistoryCard brand={brand} market={market} categoryId={category.id} />
        )}
        <RecommendedActions actions={founder.actions} />
        <NextMoveCTA brand={brand} biggestOpportunity={founder.biggestOpportunity} brandWebsite={brandWebsite} />
        <AuditCTA brandWebsite={brandWebsite} />

        {slug && (
          <div style={{ marginBottom: 14 }}>
            <ShareButton slug={slug} />
          </div>
        )}

        <button
          type="button"
          className={styles.disclosureToggle}
          onClick={() => setShowEvidence((v) => !v)}
          aria-expanded={showEvidence}
        >
          {showEvidence ? "Hide full evidence" : "View full evidence →"}
        </button>

        {showEvidence && (
          <div ref={evidenceRef}>
            <VerdictCard market={market} brand={brand} category={category?.name} report={report} onRetry={onRetry} />
            <CheckoutBattleCard brand={brand} brandWebsite={brandWebsite} destinations={report.destinations} />
            <ShareOfVoiceCard market={market} brand={brand} competitor={competitor} shareOfVoice={report.shareOfVoice} />
            <SentimentCard sentiment={sentiment} mentionCount={mentionCount} />
            <ShelvesCard market={market} brand={brand} competitor={competitor} engines={engines} />
            <FanoutCard fanout={fanout} />
            <TrustedSourcesCard trustedSources={trustedSources} />
            <FixPlanCTA brandWebsite={brandWebsite} />
            <DownloadPdfButton
              brand={brand}
              categoryName={category?.name}
              market={market}
              competitor={competitor}
              brandWebsite={brandWebsite}
              report={report}
              engines={engines}
              sentiment={sentiment}
              mentionCount={mentionCount}
              trustedSources={trustedSources}
              slug={slug}
              fullReportExpanded={userExpanded}
            />
          </div>
        )}
      </LeadGate>
    </>
  );
}

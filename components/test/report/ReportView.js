"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../test.module.css";
import StoryView from "./StoryView";
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

// Layer 1 (StoryView, always visible — see its own comment) is the default
// view; clicking the full-width "See full report" button reveals Layer 2,
// which is exactly the report this component rendered before Layer 1
// existed: VerdictCard, the share button, then the email-gated deep cards.
// Nothing about Layer 2 or the email gate changed — it just moved one
// click deeper. initialShowFull lets a caller (app/report/[slug]/page.js,
// for a `?full=1` link) land straight on Layer 2 instead of requiring the
// click — used by the homepage's "See a real report" example link so a
// visitor sees the depth immediately.
export default function ReportView({ data, onRetry, initialShowFull = false }) {
  const [showFull, setShowFull] = useState(initialShowFull);
  const expandedRef = useRef(null);
  // Only auto-scroll when the USER expanded it (a click, or the gate
  // unlocking) — never on initial mount, so a shared /report/[slug]?full=1
  // link still lands at the normal page top instead of jumping mid-page.
  const userExpandedRef = useRef(false);

  function scrollToExpanded() {
    // rAF-deferred: the DOM needs to actually reflow (blurred/clipped
    // preview -> full height, or Layer 1 -> Layer 2 appearing) before
    // scrollIntoView measures a stable position — a same-tick call can
    // scroll to where the section WAS about to be, not where it ends up.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function handleSeeFullDetails() {
    userExpandedRef.current = true;
    setShowFull(true);
  }

  useEffect(() => {
    if (showFull && userExpandedRef.current) scrollToExpanded();
  }, [showFull]);

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

  return (
    <>
      {isCustom && (
        <div className={styles.customNote}>
          Custom category — standardized benchmark not available, so these scores aren&rsquo;t
          comparable across brands the way a bank-category test is.
        </div>
      )}

      <StoryView data={data} onSeeFullDetails={handleSeeFullDetails} />

      {showFull && (
        <div ref={expandedRef}>
          <VerdictCard market={market} brand={brand} category={category?.name} report={report} onRetry={onRetry} />
          {slug && (
            <div style={{ marginBottom: 14 }}>
              <ShareButton slug={slug} />
            </div>
          )}
          <LeadGate
            market={market}
            category={category?.name}
            brand={brand}
            brandWebsite={brandWebsite}
            verdict={report.verdict}
            slug={slug}
            onUnlock={scrollToExpanded}
          >
            <CheckoutBattleCard brand={brand} brandWebsite={brandWebsite} destinations={report.destinations} />
            <ShareOfVoiceCard market={market} brand={brand} competitor={competitor} shareOfVoice={report.shareOfVoice} />
            <SentimentCard sentiment={sentiment} mentionCount={mentionCount} />
            <ShelvesCard market={market} brand={brand} competitor={competitor} engines={engines} />
            <FanoutCard fanout={fanout} />
            <TrustedSourcesCard trustedSources={trustedSources} />
            <AuditCTA brandWebsite={brandWebsite} />
            <FixPlanCTA brandWebsite={brandWebsite} />
          </LeadGate>
        </div>
      )}
    </>
  );
}

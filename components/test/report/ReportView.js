"use client";

import styles from "../test.module.css";
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

export default function ReportView({ data, onRetry }) {
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
      >
        <CheckoutBattleCard brand={brand} brandWebsite={brandWebsite} destinations={report.destinations} />
        <ShareOfVoiceCard market={market} brand={brand} competitor={competitor} shareOfVoice={report.shareOfVoice} />
        <SentimentCard sentiment={sentiment} mentionCount={mentionCount} />
        <ShelvesCard market={market} brand={brand} competitor={competitor} engines={engines} />
        <FanoutCard fanout={fanout} />
        <TrustedSourcesCard trustedSources={trustedSources} />
        <AuditCTA brandWebsite={brandWebsite} />
      </LeadGate>
    </>
  );
}

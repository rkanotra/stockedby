"use client";

import VerdictCard from "./VerdictCard";
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
    report,
    sentiment,
    mentionCount,
    engines,
    fanout,
    trustedSources,
  } = data;

  return (
    <>
      <VerdictCard market={market} brand={brand} category={category?.name} report={report} onRetry={onRetry} />
      <CheckoutBattleCard brand={brand} brandWebsite={brandWebsite} destinations={report.destinations} />
      <ShareOfVoiceCard market={market} brand={brand} competitor={competitor} shareOfVoice={report.shareOfVoice} />
      <SentimentCard sentiment={sentiment} mentionCount={mentionCount} />
      <ShelvesCard market={market} brand={brand} competitor={competitor} engines={engines} />
      <FanoutCard fanout={fanout} />
      <TrustedSourcesCard trustedSources={trustedSources} />
      <AuditCTA brandWebsite={brandWebsite} />
    </>
  );
}

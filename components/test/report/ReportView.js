"use client";

import VerdictCard from "./VerdictCard";
import CheckoutBattleCard from "./CheckoutBattleCard";
import ShareOfVoiceCard from "./ShareOfVoiceCard";
import SentimentCard from "./SentimentCard";
import ShelvesCard from "./ShelvesCard";
import FanoutCard from "./FanoutCard";
import TrustedSourcesCard from "./TrustedSourcesCard";

export default function ReportView({ data }) {
  const { market, brand, competitor, brandWebsite, report, sentiment, engines, fanout, trustedSources } = data;

  return (
    <>
      <VerdictCard market={market} brand={brand} report={report} />
      <CheckoutBattleCard brand={brand} brandWebsite={brandWebsite} destinations={report.destinations} />
      <ShareOfVoiceCard market={market} brand={brand} competitor={competitor} shareOfVoice={report.shareOfVoice} />
      <SentimentCard sentiment={sentiment} />
      <ShelvesCard market={market} brand={brand} competitor={competitor} engines={engines} />
      <FanoutCard fanout={fanout} />
      <TrustedSourcesCard trustedSources={trustedSources} />
    </>
  );
}

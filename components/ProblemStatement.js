// Editorial transition (brief section 15) — big typography, whitespace,
// no card grid. Deliberately no .rv scroll-reveal here: this section is
// meant to just exist immediately, not perform an entrance (brief section
// 48's own warning against every section fading up identically).
export default function ProblemStatement() {
  return (
    <section className="problem">
      <div className="wrap">
        <p className="problem-line">Your next competitor may not be another brand.</p>
        <p className="problem-line problem-line-muted">
          It may be the answer AI gives before your customer reaches Google.
        </p>
        <p className="problem-sub">
          More shoppers are asking AI what to buy, which brand is better, what fits their budget.
          If your brand is missing from those answers, ranking well on Google is no longer enough.
        </p>
      </div>
    </section>
  );
}

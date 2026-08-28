// Editorial transition, big typography, no card grid. Deliberately no .rv
// scroll-reveal — meant to just exist, not perform an entrance. One short
// line after the two headline lines, not a paragraph explaining them.
export default function ProblemStatement() {
  return (
    <section className="problem">
      <div className="wrap">
        <p className="problem-line">Your next competitor may not be another brand.</p>
        <p className="problem-line problem-line-muted">
          It may be the answer AI gives before your customer reaches Google.
        </p>
        <p className="problem-sub">If you&rsquo;re not in that answer, ranking on Google won&rsquo;t save you.</p>
      </div>
    </section>
  );
}

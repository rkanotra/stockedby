import DomainCheckForm from "./DomainCheckForm";

// The same conversion moment as the homepage hero — every post ends here
// so a reader who's just been convinced never has to go hunting for the
// button. Reuses DomainCheckForm verbatim (not a rewritten copy) so this
// can never drift from the homepage's own form behavior.
export default function BlogCta() {
  return (
    <section className="wrap blog-cta">
      <div className="blog-cta-in">
        <h2>Does AI recommend your brand?</h2>
        <p className="hero-note mono">Free. 2 minutes. See what ChatGPT, Gemini and Claude tell your customers.</p>
        <DomainCheckForm />
      </div>
    </section>
  );
}

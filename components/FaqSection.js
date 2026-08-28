import JsonLd from "./JsonLd";

// Real questions a merchant would actually type into Google, answered
// honestly against what StockedBy actually does today — no invented
// features. Rendered visibly (not just as JSON-LD) because Google's
// structured-data guidelines require FAQPage markup to reflect content
// that's actually on the page, not hidden metadata.
export const FAQS = [
  {
    q: "How do I check if ChatGPT recommends my brand?",
    a: "Run StockedBy's free brand check. Pick your product category, and we ask ChatGPT, Gemini and Claude the same questions your customers already ask — then show you exactly what each one says, and where it sends buyers to pay.",
  },
  {
    q: "Does StockedBy work for brands across India and the Gulf?",
    a: "Yes — that's what it's built for. Real local rivals (Flipkart, Noon, Boutiqaat), local languages (Hinglish, Arabic), and local shopping habits, market by market — not a US tool with your currency swapped in.",
  },
  {
    q: "Is the AI brand check really free?",
    a: "Yes, free forever. You see your verdict and engine scores right away; unlocking the full report (checkout routing, sentiment, next steps) just needs a work email.",
  },
  {
    q: "How long does a StockedBy test take?",
    a: "About two minutes. Pick your category, approve the shopper questions (or edit them), and get your results live.",
  },
  {
    q: "Can AI shopping agents actually buy from my website?",
    a: "That depends on whether AI apps can read your site at all. StockedBy's free Agent Readiness Audit checks in about 30 seconds — see stockedby.com/audit.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqSection() {
  return (
    <section className="wrap aisle">
      <div className="aisle-head rv">
        <h2>Questions people ask</h2>
      </div>
      <div className="aisle-plank rv" />
      <div className="faq-list">
        {FAQS.map((f) => (
          <div className="feat rv" key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </div>
      <JsonLd data={FAQ_JSON_LD} />
    </section>
  );
}

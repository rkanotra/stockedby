import PageShell from "@/components/site/PageShell";
import JourneyPreview from "@/components/purchase-check/JourneyPreview";
import TrackedLink from "@/components/analytics/TrackedLink";
import JsonLd from "@/components/JsonLd";
import s from "@/components/purchase-check/purchase.module.css";
import { buildOpenGraph, buildTwitter } from "@/lib/site";
import { purchaseConfig } from "@/lib/purchaseCheck/config";
const title =
  "Shopify Checkout Testing India — Variant, Cart & Delivery QA | StockedBy";
const description =
  "Test a real Shopify buying journey in India: product, variant, cart price, discount, delivery and checkout entry. Get evidence, fix steps and a repeatable retest.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/purchase-check" },
  openGraph: buildOpenGraph({ title, description, path: "/purchase-check" }),
  twitter: buildTwitter({ title, description }),
};
export default function PurchaseCheckPage() {
  const config = purchaseConfig();
  const faq = [
    {
      question: "What does a Shopify Purchase Check test?",
      answer:
        "It checks the product page, selected variant, expected price, discount, Indian delivery estimate, cart and checkout entry using the journey you define.",
    },
    {
      question: "Does StockedBy place a real order?",
      answer:
        "No. The check stops before payment. It does not submit payment, place an order or change your Shopify theme.",
    },
    {
      question: "Can I verify a fix?",
      answer:
        "Yes. Run the same saved journey again after your change and compare the new evidence with the original report.",
    },
    {
      question: "Which stores are supported?",
      answer:
        "The India pilot supports standard Shopify storefronts priced in INR. Custom checkouts and some third-party checkout apps may need separate verification.",
    },
  ];
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
  return (
    <PageShell>
      <JsonLd data={faqJsonLd} />
      <div className={s.root}>
        <div className={s.wrap}>
          <section className={s.hero}>
            <div>
              <p className={s.eyebrow}>
                Shopify checkout testing / India pilot
              </p>
              <h1>
                Test the buying journey
                <br />
                before shoppers
                <br />
                <em>find the failure.</em>
              </h1>
              <p className={s.intro}>
                Give StockedBy a real product, variant, offer and Indian PIN
                code. We check the journey from product page to checkout and
                show you exactly where it breaks.
              </p>
              <div className={s.actions}>
                <TrackedLink className={s.primary} href="/dashboard/purchase-check" event="purchase_check_pilot_started">
                  Start free pilot setup ↗
                </TrackedLink>
                <TrackedLink className={s.secondary} href="/purchase-check/demo" event="purchase_check_demo_opened">
                  See a sample report
                </TrackedLink>
              </div>
              <p className={s.muted}>
                Standard Shopify storefronts · INR · Stops before payment
              </p>
            </div>
            <JourneyPreview />
          </section>
          <div className={s.grid}>
            {[
              [
                "01 / YOUR RULES",
                "Tell us what should happen.",
                "Save an exact product, variant, expected price, offer and Indian delivery PIN code. You confirm the baseline.",
              ],
              [
                "02 / OBSERVED EVIDENCE",
                "See where it comes apart.",
                "An isolated browser checks the Shopify product and cart, requests a shipping estimate and looks for the checkout entry.",
              ],
              [
                "03 / VERIFIED AGAIN",
                "Fix it. Then run it again.",
                "Get a practical guide for each finding. Repeat the same journey to see which failures were resolved.",
              ],
            ].map(([n, h, p], i) => (
              <section
                className={`${s.panel} ${[s.blue, s.peach, s.mint][i]}`}
                key={n}
              >
                <p className={s.eyebrow}>{n}</p>
                <h2>{h}</h2>
                <p>{p}</p>
              </section>
            ))}
          </div>
          <section className={s.band}>
            <div className={s.split}>
              <div>
                <p className={s.eyebrow}>Built for small teams</p>
                <h2>
                  Keep the checks running.
                  <br />
                  Keep your attention for the exceptions.
                </h2>
                <p className={s.intro}>
                  Save up to five buying journeys across three stores. Turn on
                  weekly checks for the paths that matter. A result that needs
                  attention pauses that journey’s schedule until you review it.
                </p>
              </div>
              <div className={s.panel}>
                <h3>A check pack, on your terms.</h3>
                <ul className={s.simpleList}>
                  <li>20 journey runs, including any retests</li>
                  <li>Evidence and practical fix instructions</li>
                  <li>Optional weekly checks using your credits</li>
                  <li>No automatic billing or renewal</li>
                </ul>
                <p className={s.muted}>
                  {config.enabled
                    ? `₹${config.amount.toLocaleString('en-IN')} total for 20 check credits. Pay by UPI in your workspace; credits are added after receipt verification.`
                    : 'The founding pilot is open. Store setup is free, and pilot access is reviewed after store verification. No card or automatic renewal.'}
                </p>
                <TrackedLink className={s.quiet} href="/dashboard/purchase-check" event="purchase_check_pilot_started">
                  Request founding pilot access ↗
                </TrackedLink>
              </div>
            </div>
          </section>
          <section className={s.panel}>
            <h2>Know exactly what your report means.</h2>
            <p>
              Each step is marked passed within scope, needs a fix, or unable to
              verify. This pilot covers the standard Shopify path. GoKwik,
              Razorpay Magic Checkout, COD eligibility, final checkout fees and
              actual UPI payments need separate verification. A challenge or
              blocked browser is reported as uncertainty.
            </p>
            <p className={s.footnote}>
              Fixes are applied by you or your store administrator using the
              report’s instructions. Purchase Check does not change your theme,
              submit payment or place orders.
            </p>
          </section>
          <section className={s.faq} aria-labelledby="purchase-check-faq">
            <p className={s.eyebrow}>Questions founders ask</p>
            <h2 id="purchase-check-faq">Shopify checkout testing, explained.</h2>
            <div className={s.faqGrid}>
              {faq.map(({ question, answer }) => (
                <details key={question}>
                  <summary>{question}</summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

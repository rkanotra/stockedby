import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import JourneyPreview from "@/components/purchase-check/JourneyPreview";
import JsonLd from "@/components/JsonLd";
import s from "@/components/purchase-check/purchase.module.css";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const title =
  "Shopify Checkout QA Demo India — Variant, Cart & Delivery | StockedBy";
const description =
  "Explore an interactive Shopify checkout QA concept for variants, cart prices, discounts and delivery. No account, payment or stored data.";

export const metadata = {
  title,
  description,
  alternates: { canonical: "/purchase-check" },
  openGraph: buildOpenGraph({ title, description, path: "/purchase-check" }),
  twitter: buildTwitter({ title, description }),
};

export default function PurchaseCheckPage() {
  const faq = [
    {
      question: "What does the Purchase Check demo show?",
      answer:
        "It shows how a merchant could define an exact product, variant, price, discount and delivery rule, then review evidence from product page to checkout entry.",
    },
    {
      question: "Does the demo test a live Shopify store?",
      answer:
        "No. StockedBy is maintained as a side project and the live Purchase Check service is offline. The interactive demo uses clearly labelled sample data.",
    },
    {
      question: "Do I need an account?",
      answer:
        "No. The demo opens directly and does not save your activity or ask for payment.",
    },
    {
      question: "Can the demo place an order?",
      answer:
        "No. The original concept stopped before payment, and the archived demo never contacts a store or creates a cart.",
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
              <p className={s.eyebrow}>Archived product concept / interactive demo</p>
              <h1>
                A clear way to test
                <br />
                the buying
                <br />
                <em>journey.</em>
              </h1>
              <p className={s.intro}>
                Purchase Check explored how a small team could verify an exact
                Shopify product, variant, offer and delivery path before a
                shopper found the failure.
              </p>
              <div className={s.actions}>
                <Link className={s.primary} href="/purchase-check/demo">
                  Explore the interactive demo ↗
                </Link>
                <Link className={s.secondary} href="/audit">
                  Run the free site check
                </Link>
              </div>
              <p className={s.muted}>No account · No stored data · No payment</p>
            </div>
            <JourneyPreview />
          </section>

          <div className={s.grid}>
            {[
              [
                "01 / DEFINE",
                "Make the expectation exact.",
                "A useful check starts with a product, variant, expected price, offer and delivery PIN code.",
              ],
              [
                "02 / OBSERVE",
                "Show where reality differs.",
                "Evidence separates a product-page problem from a variant, cart, discount or delivery problem.",
              ],
              [
                "03 / RETEST",
                "Repeat the same rule.",
                "A saved baseline makes it possible to compare the result after a theme, catalog or shipping change.",
              ],
            ].map(([n, h, p], i) => (
              <section className={`${s.panel} ${[s.blue, s.peach, s.mint][i]}`} key={n}>
                <p className={s.eyebrow}>{n}</p>
                <h2>{h}</h2>
                <p>{p}</p>
              </section>
            ))}
          </div>

          <section className={s.band}>
            <div className={s.split}>
              <div>
                <p className={s.eyebrow}>Built as a side-project experiment</p>
                <h2>
                  The product thinking stays.
                  <br />
                  The operations are offline.
                </h2>
                <p className={s.intro}>
                  The demo preserves the merchant workspace, operator queue and
                  evidence model without maintaining accounts, payments,
                  schedules or a production database.
                </p>
              </div>
              <div className={s.panel}>
                <h3>What you can explore.</h3>
                <ul className={s.simpleList}>
                  <li>A sample Shopify buying journey</li>
                  <li>Passed, issue and unable-to-verify outcomes</li>
                  <li>Merchant and operator views</li>
                  <li>Evidence, fix guidance and retest states</li>
                </ul>
                <p className={s.muted}>
                  Everything is sample data. The demo does not contact your
                  store or retain anything you click.
                </p>
                <Link className={s.quiet} href="/purchase-check/demo">
                  Open the product demo ↗
                </Link>
              </div>
            </div>
          </section>

          <section className={s.panel}>
            <h2>A finished concept, kept useful.</h2>
            <p>
              StockedBy remains available as a free AI visibility and website
              readiness project. Purchase Check is preserved as a transparent
              product demonstration, with no suggestion that a live paid
              service is currently running.
            </p>
          </section>

          <section className={s.faq} aria-labelledby="purchase-check-faq">
            <p className={s.eyebrow}>About the archive</p>
            <h2 id="purchase-check-faq">Purchase Check, explained.</h2>
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

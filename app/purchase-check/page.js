import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import JourneyPreview from "@/components/purchase-check/JourneyPreview";
import s from "@/components/purchase-check/purchase.module.css";
import { buildOpenGraph, buildTwitter } from "@/lib/site";
import { purchaseConfig } from "@/lib/purchaseCheck/config";
const title =
  "Purchase Check — Put your store through a real buying journey | StockedBy";
const description =
  "Check exact variants, cart prices, offers and Shopify delivery estimates. Get evidence, practical fix guides and repeatable checks for your Indian store.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/purchase-check" },
  openGraph: buildOpenGraph({ title, description, path: "/purchase-check" }),
  twitter: buildTwitter({ title, description }),
};
export default function PurchaseCheckPage() {
  const config = purchaseConfig();
  return (
    <PageShell>
      <div className={s.root}>
        <div className={s.wrap}>
          <section className={s.hero}>
            <div>
              <p className={s.eyebrow}>
                StockedBy Purchase Check / India pilot
              </p>
              <h1>
                Make the journey
                <br />
                as good as
                <br />
                <em>the discovery.</em>
              </h1>
              <p className={s.intro}>
                An AI agent found your product. Can it select the right variant,
                get the right price and reach checkout? Put your store through
                the steps that matter.
              </p>
              <div className={s.actions}>
                <Link className={s.primary} href="/dashboard/purchase-check">
                  Set up your store ↗
                </Link>
                <Link className={s.secondary} href="/purchase-check/demo">
                  Explore the demo
                </Link>
              </div>
              <p className={s.muted}>
                Standard Shopify storefronts · INR · No payment submitted
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
                    : 'Launch price is being finalized. Store setup is free. Payments open only after pricing is published.'}
                </p>
                <Link className={s.quiet} href="/dashboard/purchase-check">
                  Prepare your first journey ↗
                </Link>
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
        </div>
      </div>
    </PageShell>
  );
}

import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import styles from "@/components/agent-store/storefront.module.css";
import UpiPayment from "@/components/agent-store/UpiPayment";
import { salesConfig } from "@/lib/agentStore/config";
import { getOptionalMerchant } from "@/lib/auth/requireMerchant";
import { database } from "@/lib/agentStore/server";
export const metadata = {
  title: "Agent Storefront pass — StockedBy",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function Checkout() {
  const config = salesConfig();
  const merchant = await getOptionalMerchant();
  let claims = [],
    available = true;
  if (merchant) {
    try {
      const r = await database()
        .from("manual_payment_claims")
        .select("id,status,amount_inr,created_at,review_note")
        .eq("merchant_id", merchant.merchantId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (r.error) throw r.error;
      claims = r.data;
    } catch {
      available = false;
    }
  }
  const pending = claims.some((c) => c.status === "pending");
  return (
    <PageShell>
      <div className={styles.wrap}>
        <p className={styles.kicker}>AGENT STOREFRONT / INDIA</p>
        <h1>
          A home for your
          <br />
          <em>product catalog.</em>
        </h1>
        <p className={styles.intro}>
          30 days of hosting. Up to 25 products. Your store’s checkout.
        </p>
        {!config.enabled ? (
          <div className={styles.band}>
            <h2>Paid access opens soon.</h2>
            <p>
              Launch pricing is being finalized. You can explore the builder
              now.
            </p>
            <Link href="/agent-store/demo" className={styles.primary}>
              Try the builder
            </Link>
          </div>
        ) : !merchant ? (
          <div className={styles.panel}>
            <h2>Sign in before paying.</h2>
            <p>
              Your payment and storefront access will belong to this account.
            </p>
            <Link
              href="/login?next=/checkout/agent-store"
              className={styles.primary}
            >
              Sign in to continue
            </Link>
          </div>
        ) : !available ? (
          <div className={styles.status}>
            Payments are temporarily unavailable. Please try again later.
          </div>
        ) : pending ? (
          <div className={styles.status}>
            Your payment is awaiting verification. Please do not pay again. You
            can keep preparing your{" "}
            <Link href="/dashboard/agent-store" className={styles.link}>
              catalog draft
            </Link>
            .
          </div>
        ) : (
          <UpiPayment config={config} />
        )}
        {claims.length > 0 && (
          <section className={styles.panel}>
            <h2>Your payment submissions</h2>
            {claims.map((c) => (
              <p key={c.id}>
                ₹{c.amount_inr} ·{" "}
                {new Date(c.created_at).toLocaleDateString("en-IN")} ·{" "}
                {c.status}
                {c.review_note ? ` — ${c.review_note}` : ""}
              </p>
            ))}
            <Link href="/dashboard/agent-store" className={styles.link}>
              Open your storefront workspace ↗
            </Link>
          </section>
        )}
      </div>
    </PageShell>
  );
}

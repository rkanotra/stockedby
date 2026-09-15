import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import PaymentReview from "@/components/agent-store/PaymentReview";
import styles from "@/components/agent-store/storefront.module.css";
import { requireMerchant } from "@/lib/auth/requireMerchant";
import { database } from "@/lib/agentStore/server";
import { isPaymentAdmin } from "@/lib/agentStore/payments";
export const metadata = {
  title: "Payment review — StockedBy",
  robots: { index: false, follow: false },
};
export default async function Payments() {
  const merchant = await requireMerchant("/dashboard/payments");
  if (!isPaymentAdmin(merchant, process.env.STOCKEDBY_PAYMENTS_ADMIN_EMAIL))
    notFound();
  let claims = [],
    failed = false;
  try {
    const r = await database()
      .from("manual_payment_claims")
      .select("id,amount_inr,reference,created_at,merchants(email)")
      .eq("status", "pending")
      .order("created_at")
      .limit(100);
    if (r.error) throw r.error;
    claims = r.data;
  } catch {
    failed = true;
  }
  return (
    <PageShell>
      <div className={styles.wrap}>
        <h1 className={styles.smallTitle}>Payment review</h1>
        {failed ? (
          <p>Payment review is temporarily unavailable.</p>
        ) : (
          <PaymentReview claims={claims} />
        )}
      </div>
    </PageShell>
  );
}

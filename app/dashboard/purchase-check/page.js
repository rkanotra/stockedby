import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import Workspace from "@/components/purchase-check/Workspace";
import { requireMerchant } from "@/lib/auth/requireMerchant";
import { workspace } from "@/lib/purchaseCheck/server";
import { purchaseConfig, operatorEmail } from "@/lib/purchaseCheck/config";
import { isOperator } from "@/lib/purchaseCheck/model";
import s from "@/components/purchase-check/purchase.module.css";
export const metadata = {
  title: "Your Purchase Checks — StockedBy",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const merchant = await requireMerchant("/dashboard/purchase-check");
  let data;
  try {
    data = await workspace(merchant.merchantId);
  } catch {}
  return (
    <PageShell>
      <div className={s.root}>
        <div className={`${s.wrap} ${s.wide}`}>
          {data ? (
            <Workspace
              initial={data}
              config={purchaseConfig()}
              operator={isOperator(merchant, operatorEmail())}
            />
          ) : (
            <section className={s.panel}>
              <p className={s.eyebrow}>Purchase Check</p>
              <h1>Your workspace is being connected.</h1>
              <p>
                Setup is temporarily unavailable. No check has been queued or
                charged.
              </p>
              <div className={s.actions}>
                <Link href="/purchase-check/demo" className={s.primary}>
                  Explore the working demo
                </Link>
                <Link href="/dashboard" className={s.secondary}>
                  Back to dashboard
                </Link>
                {isOperator(merchant, operatorEmail()) && (
                  <Link href="/dashboard/operations" className={s.secondary}>
                    Operator setup
                  </Link>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}

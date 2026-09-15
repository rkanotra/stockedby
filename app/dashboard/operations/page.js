import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import Operations from "@/components/purchase-check/Operations";
import { requireMerchant } from "@/lib/auth/requireMerchant";
import { operations } from "@/lib/purchaseCheck/server";
import { operatorEmail, purchaseConfig } from "@/lib/purchaseCheck/config";
import { isOperator } from "@/lib/purchaseCheck/model";
import { validMeasurementId } from "@/lib/analyticsPolicy";
import s from "@/components/purchase-check/purchase.module.css";
export const metadata = {
  title: "Operations — StockedBy",
  robots: { index: false, follow: false },
};
export default async function Page() {
  const merchant = await requireMerchant("/dashboard/operations");
  if (!isOperator(merchant, operatorEmail())) notFound();
  let data;
  try {
    data = await operations();
  } catch {}
  const setup = [
    { label: "Database and migration", ready: Boolean(data) },
    { label: "UPI checkout and launch price", ready: purchaseConfig().enabled },
    {
      label: "StockedBy GA4 ID",
      ready: validMeasurementId(process.env.NEXT_PUBLIC_GA_ID),
    },
    {
      label: "Worker has connected",
      ready: Boolean(data?.settings.heartbeat_at),
    },
  ];
  return (
    <PageShell>
      <div className={s.root}>
        <div className={`${s.wrap} ${s.wide}`}>
          {data ? (
            <Operations initial={data} setup={setup} />
          ) : (
            <section className={s.panel}>
              <p className={s.eyebrow}>Operator setup</p>
              <h1>Connect your control room.</h1>
              <p>
                The Purchase Check database is not available yet. Apply
                migrations 0010–0012 in your configured Supabase project and
                verify the server connection.
              </p>
              <p>
                The complete setup guide is in{" "}
                <code>docs/product/purchase-check-operations.md</code>. Keep
                payments closed and the worker paused until the staging
                checklist passes.
              </p>
              <Link className={s.quiet} href="/purchase-check/demo">
                Explore the operator demo ↗
              </Link>
            </section>
          )}
        </div>
      </div>
    </PageShell>
  );
}

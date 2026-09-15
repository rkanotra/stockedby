import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import Report from "@/components/purchase-check/Report";
import { requireMerchant } from "@/lib/auth/requireMerchant";
import { db, unwrap, assertId } from "@/lib/purchaseCheck/server";
import { operatorEmail } from "@/lib/purchaseCheck/config";
import { isOperator } from "@/lib/purchaseCheck/model";
import s from "@/components/purchase-check/purchase.module.css";
export const metadata = {
  title: "Purchase evidence — StockedBy",
  robots: { index: false, follow: false },
};
export default async function Page({ params }) {
  const { id } = await params;
  try {
    assertId(id);
  } catch {
    notFound();
  }
  const merchant = await requireMerchant(`/dashboard/purchase-check/${id}`);
  let query = db().from("pc_runs").select("*").eq("id", id);
  if (!isOperator(merchant, operatorEmail()))
    query = query.eq("merchant_id", merchant.merchantId);
  const run = unwrap(await query.maybeSingle());
  if (!run) notFound();
  const artifact = unwrap(
    await db()
      .from("pc_artifacts")
      .select("screenshot")
      .eq("run_id", run.id)
      .maybeSingle(),
  );
  if (run.result && artifact) run.result.screenshot = artifact.screenshot;
  const previous = run.parent_run_id
    ? unwrap(
        await db()
          .from("pc_runs")
          .select("config,result")
          .eq("id", run.parent_run_id)
          .eq("merchant_id", run.merchant_id)
          .maybeSingle(),
      )
    : null;
  return (
    <PageShell>
      <div className={s.root}>
        <div className={s.wrap}>
          <Link
            className={s.quiet}
            href={
              isOperator(merchant, operatorEmail())
                ? "/dashboard/operations"
                : "/dashboard/purchase-check"
            }
          >
            ← Back to workspace
          </Link>
          <p className={s.eyebrow}>Purchase Check / evidence</p>
          <h1>{run.config.label}</h1>
          <section className={s.panel}>
            <Report run={run} previous={previous} />
          </section>
        </div>
      </div>
    </PageShell>
  );
}

import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import CatalogEditor from "@/components/agent-store/CatalogEditor";
import styles from "@/components/agent-store/storefront.module.css";
import { requireMerchant } from "@/lib/auth/requireMerchant";
import { database, getAgentStore, getAccess } from "@/lib/agentStore/server";
export const metadata = {
  title: "Your Agent Storefront — StockedBy",
  robots: { index: false, follow: false },
};
export default async function Workspace() {
  const merchant = await requireMerchant("/dashboard/agent-store");
  let store = null,
    access = null,
    history = [],
    unavailable = false;
  try {
    [store, access] = await Promise.all([
      getAgentStore(merchant.merchantId),
      getAccess(merchant.merchantId),
    ]);
    if (store) {
      const result = await database()
        .from("agent_store_versions")
        .select("id,product_count,published_at")
        .eq("storefront_id", store.id)
        .order("published_at", { ascending: false })
        .limit(10);
      history = result.data || [];
    }
  } catch {
    unavailable = true;
  }
  return (
    <PageShell>
      <div className={styles.wrap}>
        <div className={styles.headingRow}>
          <p className={styles.kicker}>YOUR AGENT STOREFRONT</p>
          <Link href="/dashboard" className={styles.link}>
            Account dashboard
          </Link>
        </div>
        <h1 className={styles.smallTitle}>Give agents the whole picture.</h1>
        <p className={styles.intro}>
          Maintain your product details. Publish when they’re ready.
        </p>
        {unavailable ? (
          <div className={styles.empty}>
            The workspace is being prepared. You can still{" "}
            <Link href="/agent-store/demo" className={styles.link}>
              try the catalog builder
            </Link>
            .
          </div>
        ) : (
          <CatalogEditor
            initialStore={store}
            access={access}
            history={history}
          />
        )}
      </div>
    </PageShell>
  );
}

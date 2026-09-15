import Brand from "@/components/home/Brand";
import styles from "@/components/test/test.module.css";
import { requireMerchant } from "@/lib/auth/requireMerchant";
import { getStoreForMerchant } from "@/lib/shopify/stores";
import { getProductCatalogPage, getLatestReadinessScan, getReadinessHistory } from "@/lib/commerce/catalog";
import { buildRecommendations } from "@/lib/commerce/recommendations";
import { productTier } from "@/lib/commerce/readiness";
import ConnectStoreForm from "@/components/dashboard/ConnectStoreForm";
import SyncPanel from "@/components/dashboard/SyncPanel";
import LogoutButton from "@/components/dashboard/LogoutButton";

export const metadata = {
  title: "Dashboard — StockedBy",
  robots: { index: false, follow: false },
};

const TIER_LABELS = { ready: "Ready", needs_work: "Needs work", blocked: "Blocked" };

export default async function DashboardPage() {
  const merchant = await requireMerchant();
  const store = await getStoreForMerchant(merchant.merchantId);

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.topNav}>
          <Brand inverse />
          <LogoutButton />
        </div>
        <div className={styles.mark}>Merchant dashboard</div>
        <h1 className={styles.title}>Commerce readiness</h1>
        <p className={styles.sub}>Signed in as {merchant.email}</p>

        {!store ? (
          <div className={styles.card}>
            <div className={styles.h2}>Connect your Shopify store</div>
            <p className={styles.sectionHint}>
              Connect your store to see your AI Commerce Readiness Score — how ready your catalog is for AI
              shopping agents to discover, describe and complete a purchase.
            </p>
            <ConnectStoreForm />
          </div>
        ) : store.status === "needs_reconnect" ? (
          <div className={styles.card}>
            <div className={styles.h2}>{store.shop_domain}</div>
            <p className={styles.errBanner}>
              Your Shopify connection needs to be renewed — {store.last_sync_error || "the access token is no longer valid"}.
            </p>
            <a className={styles.btn} href={`/api/shopify/install?shop=${encodeURIComponent(store.shop_domain)}`}>
              Reconnect Shopify store
            </a>
          </div>
        ) : (
          <StoreDashboard storeId={store.id} shopDomain={store.shop_domain} syncStatus={store.sync_status} />
        )}
      </div>
    </div>
  );
}

async function StoreDashboard({ storeId, shopDomain, syncStatus }) {
  const [scan, history, catalog] = await Promise.all([
    getLatestReadinessScan(storeId),
    getReadinessHistory(storeId),
    getProductCatalogPage(storeId, { limit: 25 }),
  ]);
  const recommendations = scan ? buildRecommendations(scan) : [];

  return (
    <>
      <div className={styles.card}>
        <div className={styles.h2}>{shopDomain}</div>
        <p className={styles.sectionHint}>
          {catalog.total > 0
            ? `${catalog.total} product${catalog.total === 1 ? "" : "s"} synced.`
            : "Not synced yet — run your first catalog sync below."}
        </p>
        <SyncPanel initialSyncStatus={syncStatus} hasProducts={catalog.total > 0} />
      </div>

      {scan && (
        <div className={styles.card}>
          <div className={styles.h2}>AI Commerce Readiness Score</div>
          <div className={styles.founderScore}>
            {scan.overall_score}
            <span className={styles.founderScoreMax}>/100</span>
          </div>
          <div className={styles.founderStats}>
            <div className={styles.founderStat}>
              <span className={styles.founderStatValue}>{scan.discoverable_score ?? "—"}</span>
              <span className={styles.founderStatLabel}>Discoverable</span>
            </div>
            <div className={styles.founderStat}>
              <span className={styles.founderStatValue}>{scan.readable_score ?? "—"}</span>
              <span className={styles.founderStatLabel}>Readable</span>
            </div>
            <div className={styles.founderStat}>
              <span className={styles.founderStatValue}>{scan.transactable_score ?? "—"}</span>
              <span className={styles.founderStatLabel}>Transactable</span>
            </div>
            <div className={styles.founderStat}>
              <span className={styles.founderStatValue}>{scan.ready_count}</span>
              <span className={styles.founderStatLabel}>Ready</span>
            </div>
            <div className={styles.founderStat}>
              <span className={styles.founderStatValue}>{scan.needs_work_count}</span>
              <span className={styles.founderStatLabel}>Needs work</span>
            </div>
            <div className={styles.founderStat}>
              <span className={styles.founderStatValue}>{scan.blocked_count}</span>
              <span className={styles.founderStatLabel}>Blocked</span>
            </div>
          </div>

          {history.length >= 2 && (
            <p className={styles.sectionHint}>
              Score {history[0].overall_score} on {new Date(history[0].computed_at).toLocaleDateString()}, now{" "}
              {history[history.length - 1].overall_score} as of{" "}
              {new Date(history[history.length - 1].computed_at).toLocaleDateString()} — across {history.length} scans.
            </p>
          )}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className={styles.card}>
          <div className={styles.h2}>Recommended actions</div>
          {recommendations.map((r) => (
            <div className={styles.actionItem} key={r.code}>
              <span className={styles.actionImpact}>{r.severity.replace("_", " ")}</span>
              <div className={styles.actionTitle}>{r.title}</div>
              <div className={styles.actionDetail}>{r.detail}</div>
            </div>
          ))}
        </div>
      )}

      {scan && scan.issues?.length > 0 && (
        <div className={styles.card}>
          <div className={styles.h2}>Issues found</div>
          {scan.issues.map((issue) => (
            <div className={styles.sovrow} key={issue.code}>
              <span>{issue.label}</span>
              <span className={styles.p}>
                {issue.affectedCount} product{issue.affectedCount === 1 ? "" : "s"}
              </span>
            </div>
          ))}
        </div>
      )}

      {catalog.products.length > 0 && (
        <div className={styles.card}>
          <div className={styles.h2}>Catalog (lowest readiness first)</div>
          <div className={styles.catlist}>
            {catalog.products.map((p) => {
              const tier = p.readiness_score !== null ? productTier(p.readiness_score) : null;
              return (
                <div className={styles.catrow} key={p.handle || p.title}>
                  <span>{p.title || "(untitled product)"}</span>
                  <span className={styles.g}>
                    {p.readiness_score !== null ? `${p.readiness_score}/100` : "—"}
                    {tier ? ` · ${TIER_LABELS[tier]}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

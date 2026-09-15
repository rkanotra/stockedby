import PageShell from "@/components/site/PageShell";
import CatalogEditor from "@/components/agent-store/CatalogEditor";
import styles from "@/components/agent-store/storefront.module.css";
export const metadata = {
  title: "Try Agent Storefront — StockedBy",
  robots: { index: false, follow: true },
};
export default function DemoPage() {
  return (
    <PageShell>
      <div className={styles.wrap}>
        <p className={styles.kicker}>AGENT STOREFRONT / TRY IT</p>
        <h1>
          Build a clearer
          <br />
          <em>product catalog.</em>
        </h1>
        <p className={styles.intro}>
          Add one product to see what agents could read.
        </p>
        <CatalogEditor demo />
      </div>
    </PageShell>
  );
}

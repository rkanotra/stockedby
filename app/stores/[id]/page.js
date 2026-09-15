import { notFound } from "next/navigation";
import PageShell from "@/components/site/PageShell";
import styles from "@/components/agent-store/storefront.module.css";
import { publicStore } from "@/lib/agentStore/server";
import { buildAgentCatalog } from "@/lib/agentStore/catalog";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Product catalog — StockedBy",
  robots: { index: false, follow: true },
};
export default async function StorePage({ params }) {
  const { id } = await params;
  const store = await publicStore(id);
  if (!store) notFound();
  const c = store.published;
  const feed = buildAgentCatalog(c, store.published_at);
  const fresh = feed.itemListElement[0]?.item.offers;
  return (
    <PageShell>
      <div className={styles.wrap}>
        <p className={styles.kicker}>MERCHANT-MAINTAINED CATALOG</p>
        <h1>{c.name}</h1>
        <p className={styles.intro}>
          Product information supplied by this merchant. Confirm current details
          on their website.
        </p>
        <p className={styles.muted}>
          Published{" "}
          {new Date(store.published_at).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
          })}{" "}
          IST
        </p>
        <div className={styles.actions}>
          <a className={styles.primary} href={c.domain} rel="nofollow">
            Visit store ↗
          </a>
          <a href={`/stores/${id}/catalog.json`} className={styles.secondary}>
            Read product data
          </a>
          <a href={`/stores/${id}/llms.txt`} className={styles.link}>
            Agent guide
          </a>
        </div>
        {!fresh && (
          <div className={styles.status}>
            This catalog needs a refresh. Check prices and stock on the merchant
            website.
          </div>
        )}
        <div className={styles.grid}>
          {c.products.map((p) => (
            <article className={styles.panel} key={p.sku}>
              <span className={styles.badge}>{p.sku}</span>
              <h2 style={{ marginTop: 16 }}>{p.title}</h2>
              <p>{p.description}</p>
              {fresh && (
                <p>
                  ₹{Number(p.price).toLocaleString("en-IN")} ·{" "}
                  {
                    {
                      InStock: "In stock",
                      OutOfStock: "Out of stock",
                      PreOrder: "Preorder",
                    }[p.availability]
                  }
                </p>
              )}
              <a href={p.url} className={styles.link} rel="nofollow">
                View on merchant website ↗
              </a>
            </article>
          ))}
        </div>
        <section className={styles.workspace}>
          <div className={styles.panel}>
            <h2>Delivery</h2>
            <p>{c.delivery}</p>
          </div>
          <div className={styles.panel}>
            <h2>Returns</h2>
            <p>{c.returns}</p>
          </div>
        </section>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(feed).replace(/</g, "\\u003c"),
          }}
        />
      </div>
    </PageShell>
  );
}

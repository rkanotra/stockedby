import PageShell from "@/components/site/PageShell";
import Demo from "@/components/purchase-check/Demo";
import s from "@/components/purchase-check/purchase.module.css";
export const metadata = {
  title: "Try Purchase Check — StockedBy",
  robots: { index: false, follow: false },
};
export default function Page() {
  return (
    <PageShell>
      <div className={s.root}>
        <div className={`${s.wrap} ${s.wide}`}>
          <Demo />
        </div>
      </div>
    </PageShell>
  );
}

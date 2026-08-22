import AuditFlow from "@/components/audit/AuditFlow";

export const metadata = {
  title: "Can AI apps read your website? — StockedBy",
  description:
    "If AI can't read your shop, it can't recommend or sell your products. Free check, 30 seconds.",
};

export default async function AuditPage({ searchParams }) {
  const params = await searchParams;
  const domainParam = typeof params?.domain === "string" ? params.domain : "";
  return <AuditFlow initialDomain={domainParam} />;
}

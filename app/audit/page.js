import AuditFlow from "@/components/audit/AuditFlow";

export const metadata = {
  title: "Agent Readiness Audit — StockedBy",
  description:
    "Check whether AI agents can discover, read, and actually buy from your site — robots.txt, llms.txt, agentic checkout manifests, and product structured data.",
};

export default async function AuditPage({ searchParams }) {
  const params = await searchParams;
  const domainParam = typeof params?.domain === "string" ? params.domain : "";
  return <AuditFlow initialDomain={domainParam} />;
}

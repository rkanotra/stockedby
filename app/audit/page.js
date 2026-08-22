import AuditFlow from "@/components/audit/AuditFlow";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "Can AI apps read your website? — StockedBy";
const DESCRIPTION =
  "If AI can't read your shop, it can't recommend or sell your products. Free check, 30 seconds.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/audit" },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/audit" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

export default async function AuditPage({ searchParams }) {
  const params = await searchParams;
  const domainParam = typeof params?.domain === "string" ? params.domain : "";
  return <AuditFlow initialDomain={domainParam} />;
}

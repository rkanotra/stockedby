import FixFlow from "@/components/fix/FixFlow";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "Fix your website so AI can read it — StockedBy";
const DESCRIPTION =
  "Free, paste-ready code for AI apps to find and understand your products — plus an llms.txt file and install steps for your platform.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/fix" },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/fix" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

export default async function FixPage({ searchParams }) {
  const params = await searchParams;
  const domainParam = typeof params?.domain === "string" ? params.domain : "";
  return <FixFlow initialDomain={domainParam} />;
}

import { InformationPage } from "@/components/studio/Marketing";
import { buildOpenGraph, buildTwitter } from "@/lib/site";
const title = "Privacy — StockedBy";
const description =
  "How StockedBy handles browser storage, uploaded files, OpenAI requests and analytics.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: buildOpenGraph({ title, description, path: "/privacy" }),
  twitter: buildTwitter({ title, description }),
};
export default function Page() {
  return <InformationPage kind="privacy" />;
}

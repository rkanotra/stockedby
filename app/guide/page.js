import { InformationPage } from "@/components/studio/Marketing";
import { buildOpenGraph, buildTwitter } from "@/lib/site";
const title = "Field guide — StockedBy";
const description =
  "How to build workflows, use company standards, review AI drafts and export your delivery package.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/guide" },
  openGraph: buildOpenGraph({ title, description, path: "/guide" }),
  twitter: buildTwitter({ title, description }),
};
export default function Page() {
  return <InformationPage kind="guide" />;
}

import { InformationPage } from "@/components/studio/Marketing";
import { buildOpenGraph, buildTwitter } from "@/lib/site";
const title = "Earlier experiments — StockedBy";
const description =
  "StockedBy’s earlier AI visibility and commerce experiments.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/archive" },
  openGraph: buildOpenGraph({ title, description, path: "/archive" }),
  twitter: buildTwitter({ title, description }),
};
export default function Page() {
  return <InformationPage kind="archive" />;
}

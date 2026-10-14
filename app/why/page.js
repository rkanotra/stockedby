import { InformationPage } from "@/components/studio/Marketing";
import { buildOpenGraph, buildTwitter } from "@/lib/site";
const title = "Why StockedBy — StockedBy";
const description =
  "Keep the reasoning connected from product idea to delivery handoff.";
export const metadata = {
  title,
  description,
  alternates: { canonical: "/why" },
  openGraph: buildOpenGraph({ title, description, path: "/why" }),
  twitter: buildTwitter({ title, description }),
};
export default function Page() {
  return <InformationPage kind="why" />;
}

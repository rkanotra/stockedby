import { Suspense } from "react";
import TestFlow from "@/components/test/TestFlow";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "Check my brand — free — StockedBy";
const DESCRIPTION = "See if ChatGPT, Gemini and Claude recommend your brand — free, in about 2 minutes.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Fixed path, not the request's ?domain=... — every prefilled variant of
  // this page is the same canonical destination, not distinct content.
  alternates: { canonical: "/test" },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/test" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

// TestFlow reads the ?domain= param via useSearchParams, which requires a
// Suspense boundary to keep this route prerenderable — see Next's own docs
// on useSearchParams + prerendering.
export default function TestPage() {
  return (
    <Suspense fallback={null}>
      <TestFlow />
    </Suspense>
  );
}

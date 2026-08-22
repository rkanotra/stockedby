import { Suspense } from "react";
import TestFlow from "@/components/test/TestFlow";

export const metadata = {
  title: "Check my brand — free — StockedBy",
  description: "See if ChatGPT, Gemini and Claude recommend your brand — free, in about 2 minutes.",
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

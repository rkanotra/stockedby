import Link from "next/link";
import PageShell from "@/components/site/PageShell";
import { buildOpenGraph, buildTwitter } from "@/lib/site";

const TITLE = "Privacy — StockedBy";
const DESCRIPTION = "What StockedBy collects, why, and how to ask us to delete it.";

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/privacy" },
  openGraph: buildOpenGraph({ title: TITLE, description: DESCRIPTION, path: "/privacy" }),
  twitter: buildTwitter({ title: TITLE, description: DESCRIPTION }),
};

// Deliberately short and specific to what this app actually does today —
// no boilerplate about features that don't exist yet (CLAUDE.md: "no
// roadmap content on public pages"). Update this if what's collected
// changes; don't describe a practice before it's real.
export default function PrivacyPage() {
  return (
    <PageShell>
    <article className="wrap legal">
      <span className="page-kicker">YOUR INFORMATION</span>
      <h1>Privacy</h1>
      <p className="legal-updated">Last updated 2026.</p>

      <h2>What we collect</h2>
      <p>
        Free shelf test (/test): the brand name, website and market you enter, and the
        shopper questions you run. We save the report so you can share it.
      </p>
      <p>
        Unlocking a full report: your email, your website, and an optional note about your
        biggest pain point.
      </p>
      <p>
        Free website check (/audit): only the website address you enter. We don&rsquo;t ask
        for your email there.
      </p>
      <p>We also log your IP address briefly, to stop one visitor from overusing a free tool.</p>

      <h2>Why</h2>
      <p>To run your tests, deliver reports, maintain your storefront, manage paid access and stop abuse. With your permission, we also measure website use.</p>

      <h2>Who else sees it</h2>
      <p>
        The shopper questions go to Anthropic, Google and OpenAI to generate real AI answers.
        Your email and report go through Resend to send you mail, and Supabase to store it.
        We never sell your data, and we don&rsquo;t use it for advertising.
      </p>

      <h2>Agent Storefront and payments</h2>
      <p>Your account stores catalog drafts, publication history and domain-verification details. Publishing makes the catalog and store policies public. Unpublished drafts and payment submissions remain private.</p>
      <p>When UPI payments open, we store the reference you submit, the amount, review status and access expiry. We do not collect your UPI PIN or bank login. Payment references are reviewed against received payments before access is granted.</p>
      <h2>Purchase Check</h2>
      <p>We store your verified store address, product and variant links, expected prices, discount code, delivery PIN code and state, check results, credit history and review notes. These reports are private to your account and StockedBy’s authorized operator. We do not ask for a customer’s name, full address or payment credentials to run a check.</p>
      <p>Checks use an isolated browser to read the store and create a test cart. The runner may operate on GitHub Actions using our configured database connection. It does not submit payment or place an order. Cart screenshots are removed after 30 days when the worker next runs; the report and credit records remain available until deleted through an account deletion request. Saved weekly checks use your credits and can be turned off in your workspace.</p>
      <h2>Optional analytics</h2>
      <p>If you allow analytics, Google Analytics receives page visits and feature-use events. We exclude email addresses, entered website addresses, catalog content, purchase rules and payment references from those events. Report, purchase-check and storefront identifiers are removed from tracked page paths. You can change your choice using Analytics preferences.</p>
      <h2>Your rights</h2>
      <p>
        This applies under India&rsquo;s DPDP Act and UAE/Saudi PDPL. You can ask us to show
        you what we have, or delete it — email{" "}
        <a href="mailto:privacy@stockedby.com">privacy@stockedby.com</a>.
      </p>

      <Link href="/" className="btn-ghost" style={{ display: "inline-block", marginTop: 24 }}>
        Back home
      </Link>
    </article>
    </PageShell>
  );
}

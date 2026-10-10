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
      <p className="legal-updated">Last updated 10 October 2026.</p>

      <h2>What we collect</h2>
      <p>
        Free visibility test (/test): the brand name, website, market and shopper
        questions you enter. StockedBy processes them for the current test and
        returns the result to your browser. The report is not saved to a StockedBy
        database.
      </p>
      <p>
        Free website check (/audit): only the website address you enter. We don&rsquo;t ask
        for your email there.
      </p>
      <p>
        We also use your IP address briefly in memory to stop one visitor from
        overusing a free tool. The counter expires automatically.
      </p>

      <h2>Why</h2>
      <p>
        To run a one-off test, generate its report and stop abuse. With your
        permission, we also measure website use.
      </p>

      <h2>Who else sees it</h2>
      <p>
        The shopper questions go to Anthropic, Google and OpenAI to generate real AI answers.
        If you ask StockedBy to email a fix, the email and report go through
        Resend for delivery. StockedBy does not maintain customer accounts or a
        production report database. We never sell your data, and we don&rsquo;t use
        it for advertising.
      </p>

      <h2>Product demos</h2>
      <p>
        Purchase Check and Agent Storefront demos use sample data. They do not
        create an account, contact your store, submit payment or save what you
        click.
      </p>
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

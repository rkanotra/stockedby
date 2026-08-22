import Link from "next/link";

export const metadata = {
  title: "Privacy — StockedBy",
  description: "What StockedBy collects, why, and how to ask us to delete it.",
};

// Deliberately short and specific to what this app actually does today —
// no boilerplate about features that don't exist yet (CLAUDE.md: "no
// roadmap content on public pages"). Update this if what's collected
// changes; don't describe a practice before it's real.
export default function PrivacyPage() {
  return (
    <div className="wrap legal">
      <Link href="/" className="logo" style={{ display: "inline-block", marginBottom: 24 }}>
        stocked<b>by</b>
      </Link>
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
      <p>To run your test, email you your report, and stop abuse of the free tools. That&rsquo;s it.</p>

      <h2>Who else sees it</h2>
      <p>
        The shopper questions go to Anthropic, Google and OpenAI to generate real AI answers.
        Your email and report go through Resend to send you mail, and Supabase to store it.
        We never sell your data, and we don&rsquo;t use it for advertising.
      </p>

      <h2>Your rights</h2>
      <p>
        This applies under India&rsquo;s DPDP Act and UAE/Saudi PDPL. You can ask us to show
        you what we have, or delete it — email{" "}
        <a href="mailto:privacy@stockedby.com">privacy@stockedby.com</a>.
      </p>

      <Link href="/" className="btn-ghost" style={{ display: "inline-block", marginTop: 24 }}>
        Back home
      </Link>
    </div>
  );
}

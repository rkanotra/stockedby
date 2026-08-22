"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// The homepage's entire job is this one input — see CLAUDE.md's homepage
// philosophy note. Carries straight into /test's domain-first wizard
// (components/test/DomainStep.js), which shows the same value again,
// editable, rather than skipping it — this form is a shortcut into that
// step, not a replacement for it (a visitor landing on /test directly still
// needs somewhere to type it).
export default function DomainCheckForm() {
  const [domain, setDomain] = useState("");
  const router = useRouter();

  function handleSubmit(e) {
    e.preventDefault();
    const d = domain.trim();
    router.push(d ? `/test?domain=${encodeURIComponent(d)}` : "/test");
  }

  return (
    <form className="domain-form" onSubmit={handleSubmit}>
      <input
        type="text"
        inputMode="url"
        placeholder="yourbrand.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        className="domain-input"
        aria-label="Your website"
        autoComplete="url"
      />
      <button type="submit" className="btn-primary domain-submit">
        Check my brand — free
      </button>
    </form>
  );
}

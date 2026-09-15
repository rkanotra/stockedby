"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { safeDecode } from "@/lib/scoring";

// The homepage's entire job is this one input — see CLAUDE.md's homepage
// philosophy note. Carries straight into /test's domain-first wizard
// (components/test/DomainStep.js), which shows the same value again,
// editable, rather than skipping it — this form is a shortcut into that
// step, not a replacement for it (a visitor landing on /test directly still
// needs somewhere to type it).
export default function DomainCheckForm() {
  const [domain, setDomain] = useState("");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const submitting = useRef(false);
  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    // safeDecode first: if the pasted text was itself already
    // percent-encoded (e.g. copied from an already-encoded link), decode it
    // before re-encoding so /test's query string never ends up
    // double-encoded (see lib/scoring.js's safeDecode comment).
    const d = safeDecode(domain.trim());
    startTransition(() => {
      router.push(d ? `/test?domain=${encodeURIComponent(d)}` : "/test");
    });
  }

  return (
    <form className="domain-form" onSubmit={handleSubmit}>
      <label htmlFor="brand-domain" className="domain-label">Your website</label>
      <input
        id="brand-domain"
        aria-describedby="domain-help"
        type="text"
        inputMode="url"
        placeholder="yourbrand.com"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        className="domain-input"
        aria-label="Your website"
        autoComplete="url"
      />
      <button type="submit" className="btn-primary domain-submit" disabled={pending} aria-busy={pending}>
        <span>{pending ? "Opening your brand check…" : "Check my brand — free"}</span>
      </button>
    </form>
  );
}

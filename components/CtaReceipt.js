"use client";

import { useState } from "react";

export default function CtaReceipt() {
  const [showToast, setShowToast] = useState(false);
  const [brand, setBrand] = useState("");
  const [email, setEmail] = useState("");
  const [pain, setPain] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    // MVP stub: no email gate yet, no /api/lead call — see CLAUDE.md hard rule 8.
    console.log("lead form (stub, not sent):", {
      brand: brand.trim(),
      email: email.trim(),
      painpoint: pain.trim(),
      source: "landing",
    });
    setShowToast(true);
  }

  return (
    <section id="test" className="wrap" style={{ paddingBottom: "20px" }}>
      <form className="receipt rv" onSubmit={handleSubmit}>
        <h2>Run your free shelf test</h2>
        <p className="r-sub">Tell us where to send your full report. We read every pain point personally — it decides what we build next.</p>
        <label htmlFor="f-brand">Brand name</label>
        <input
          id="f-brand"
          type="text"
          placeholder="e.g. Vincent Chase"
          autoComplete="organization"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <label htmlFor="f-email">Work email</label>
        <input
          id="f-email"
          type="email"
          placeholder="you@yourbrand.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label htmlFor="f-pain">Your biggest pain point selling online</label>
        <textarea
          id="f-pain"
          rows={3}
          placeholder="e.g. marketplace commissions eating margins, can't get discovered without ads…"
          value={pain}
          onChange={(e) => setPain(e.target.value)}
        />
        <button type="submit" className="btn-primary">Start my test</button>
        <div className="r-fine">Full report is free — no card, no signup. · Privacy policy</div>
        {showToast && (
          <div className="r-toast" role="status">
            Coming soon — the live shelf test is being wired up. Thanks for your interest!
          </div>
        )}
      </form>
    </section>
  );
}

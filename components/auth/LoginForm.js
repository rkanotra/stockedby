"use client";

import { useState } from "react";
import styles from "../test/test.module.css";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState("form"); // form | sending | sent | error
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setPhase("sending");
    setError("");
    try {
      const res = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setPhase("form");
        return;
      }
      setPhase("sent");
    } catch {
      setError("Network error — please try again.");
      setPhase("form");
    }
  }

  if (phase === "sent") {
    return (
      <div className={styles.card}>
        <div className={styles.h2}>Check your email</div>
        <p className={styles.sectionHint}>
          We sent a sign-in link to {email}. It expires in 15 minutes and works once.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.gateForm} onSubmit={submit}>
      <label htmlFor="login-email" className={styles.label}>Work email</label>
      <input
        id="login-email"
        autoComplete="email"
        type="email"
        required
        placeholder="you@yourbrand.com"
        className={styles.input}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={phase === "sending"}
      />
      {error && <div className={styles.errBanner}>{error}</div>}
      <button type="submit" className={styles.btn} disabled={phase === "sending"}>
        {phase === "sending" ? "Sending…" : "Send sign-in link"}
      </button>
    </form>
  );
}

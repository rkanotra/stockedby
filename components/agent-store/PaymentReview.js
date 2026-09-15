"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./storefront.module.css";
export default function PaymentReview({ claims }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function review(e, id) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await fetch("/api/payments/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          decision: form.get("decision"),
          note: form.get("note"),
          confirmed: form.get("confirmed") === "on",
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage("Review saved. Approved payments activate 30 days once.");
      router.refresh();
    } catch (e) {
      setMessage(e.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.panel}>
      <h2>Pending UPI payments</h2>
      <p>
        Match the reference and full amount against received funds in your bank
        or UPI merchant statement before approving. A customer screenshot is not
        proof of receipt.
      </p>
      {message && (
        <p role="status" className={styles.status}>
          {message}
        </p>
      )}
      {!claims.length && <p>No payments awaiting review.</p>}
      {claims.map((c) => (
        <form
          className={styles.reviewRow}
          key={c.id}
          onSubmit={(e) => review(e, c.id)}
        >
          <p>
            <strong>
              ₹{c.amount_inr} · {c.reference}
            </strong>
            <br />
            {c.merchants?.email}
            <br />
            {new Date(c.created_at).toLocaleString("en-IN")}
          </p>
          <label className={styles.field}>
            Decision
            <select name="decision" className={styles.input}>
              <option value="approved">Approve—funds received</option>
              <option value="rejected">Reject—payment not verified</option>
            </select>
          </label>
          <label className={styles.field}>
            Review note (visible to customer)
            <input
              className={styles.input}
              name="note"
              required
              maxLength={500}
            />
          </label>
          <label className={styles.checkbox}>
            <input type="checkbox" name="confirmed" required />I checked the
            bank record and amount.
          </label>
          <button className={styles.primary} disabled={busy}>
            Save review
          </button>
        </form>
      ))}
    </div>
  );
}

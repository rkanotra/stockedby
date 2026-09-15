"use client";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { upiLink } from "@/lib/agentStore/config";
import styles from "./storefront.module.css";
export default function UpiPayment({ config }) {
  const [reference, setReference] = useState(""),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/payments/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, accepted }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setMessage(
        "Payment reference submitted. Access starts after the payment is checked.",
      );
      router.refresh();
    } catch (e) {
      setMessage(e.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={styles.workspace}>
      <section className={styles.panel}>
        <h2>Pay with your UPI app.</h2>
        <div className={styles.price}>
          ₹{config.amount.toLocaleString("en-IN")}
        </div>
        <p>Total for 30 days · No automatic renewal</p>
        <Image
          unoptimized
          width={600}
          height={600}
          src={config.qrPath}
          alt={`UPI payment QR for ${config.payee}`}
          className={styles.qr}
        />
        <p>
          Payee: <strong>{config.payee}</strong>
          <br />
          UPI ID: <strong>{config.upiId}</strong>
        </p>
        <a href={upiLink(config)} className={styles.primary}>
          Open UPI app
        </a>
        <p className={styles.muted}>
          On a computer, scan with your phone. Check the payee and amount before
          paying.
        </p>
      </section>
      <form className={styles.panel} onSubmit={submit}>
        <h2>Then share the payment reference.</h2>
        <p>Copy the 12-digit UPI reference from your payment details.</p>
        <label className={styles.field}>
          UPI reference / RRN
          <input
            className={styles.input}
            inputMode="numeric"
            pattern="[0-9]{12}"
            maxLength={12}
            required
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            required
          />
          <span>
            I paid the amount shown. I understand access starts after manual
            verification and lasts 30 days, with no automatic renewal.
          </span>
        </label>
        <button className={styles.primary} disabled={busy}>
          {busy ? "Submitting…" : "Submit for verification"}
        </button>
        {message && (
          <p role="status" className={styles.status}>
            {message}
          </p>
        )}
        <p className={styles.muted}>
          A reference submission is not a payment confirmation. For failed,
          duplicate or incorrect payments, contact{" "}
          <a className={styles.link} href={`mailto:${config.support}`}>
            {config.support}
          </a>
          . Seller: {config.seller}.
        </p>
      </form>
    </div>
  );
}

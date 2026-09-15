"use client";
import { useState } from "react";
import Workspace from "./Workspace";
import Operations from "./Operations";
import { demoWorkspace } from "@/lib/purchaseCheck/demo";
import s from "./purchase.module.css";
export default function Demo() {
  const [view, setView] = useState("merchant");
  const data = demoWorkspace();
  const ops = {
    settings: { ...data.settings, daily_limit: 20 },
    runs: data.runs.map((r) => ({
      ...r,
      merchants: { email: "founder@example.test" },
    })),
    payments: [
      {
        id: "sample-payment",
        reference: "000000000000",
        amount_inr: 100,
        status: "pending",
        merchants: { email: "sample@example.test" },
      },
    ],
    accounts: [
      {
        merchant_id: "sample-merchant",
        credits: 6,
        merchants: { email: "founder@example.test" },
      },
    ],
    ledger: [],
  };
  return (
    <>
      <div className={s.tabs} aria-label="Demo view">
        <button
          className={s.secondary}
          aria-pressed={view === "merchant"}
          onClick={() => setView("merchant")}
        >
          Customer view
        </button>
        <button
          className={s.secondary}
          aria-pressed={view === "operator"}
          onClick={() => setView("operator")}
        >
          Your operator view
        </button>
        <span className={s.counter}>Interactive product preview</span>
      </div>
      {view === "merchant" ? (
        <Workspace initial={data} config={{ enabled: false }} demo />
      ) : (
        <Operations initial={ops} demo />
      )}
    </>
  );
}

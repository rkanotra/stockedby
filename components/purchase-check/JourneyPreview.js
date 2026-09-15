"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import s from "./purchase.module.css";
export default function JourneyPreview() {
  const [step, setStep] = useState(0),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () =>
        setStep((n) => {
          if (n >= 3) {
            setPlaying(false);
            return n;
          }
          return n + 1;
        }),
      1100,
    );
    return () => clearInterval(id);
  }, [playing]);
  return (
    <div className={s.taskCard}>
      <div className={s.eyebrow}>A purchase journey / sample</div>
      <div className={s.taskInput}>
        “Blue shirt, size M. Use WELCOME10. Deliver to Bengaluru.”
      </div>
      {[
        "Read the exact product",
        "Check the selected variant",
        "Verify the cart & offer",
        "Open checkout. Stop before payment.",
      ].map((label, i) => (
        <div className={s.step} key={label} data-active={i === step}>
          <i>{i < step ? "✓" : `0${i + 1}`}</i>
          <span>{label}</span>
        </div>
      ))}
      <div className={s.taskFooter}>
        <button
          className={s.secondary}
          onClick={() => {
            setStep(0);
            setPlaying((v) => !v);
          }}
        >
          {playing ? "Pause" : "Play journey"} {playing ? "Ⅱ" : "↗"}
        </button>
        <Link className={s.link} href="/purchase-check/demo">
          Explore sample report
        </Link>
      </div>
      <p className={s.footnote}>
        An illustration of the workflow. Live checks use the purchase rules you
        confirm.
      </p>
    </div>
  );
}

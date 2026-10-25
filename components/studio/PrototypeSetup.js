"use client";
import { useState } from "react";
import { PROTOTYPE_PLATFORMS } from "@/lib/studio/prototype-settings";
import s from "./prototype-setup.module.css";

export default function PrototypeSetup({ settings, existing, onSubmit, onCancel }) {
  const [value, setValue] = useState({ platform: "", audience: "", journey: "", ...settings });
  return <form className={s.form} onSubmit={e => { e.preventDefault(); if (value.platform) onSubmit(value); }}>
    <span className={s.eyebrow}>BEFORE WE BUILD</span>
    <h2 id="modal-title">Where will people use it?</h2>
    <p>Choose the experience first. Your requirements and company standards shape what we build.</p>
    <fieldset className={s.platforms}>
      <legend>Primary device</legend>
      {PROTOTYPE_PLATFORMS.map(platform => <label key={platform.id} className={value.platform === platform.id ? s.selected : ""}>
        <input type="radio" name="prototype-platform" value={platform.id} checked={value.platform === platform.id} onChange={() => setValue(v => ({ ...v, platform: platform.id }))} required />
        <span className={`${s.device} ${s[platform.id]}`} aria-hidden="true" />
        <strong>{platform.label}</strong><small>{platform.description}</small>
      </label>)}
    </fieldset>
    <label className={s.field}>Who is this for? <span>Optional</span><input value={value.audience} maxLength={160} onChange={e => setValue(v => ({ ...v, audience: e.target.value }))} placeholder="For example, customers applying for a loan" /></label>
    <label className={s.field}>Which journey should we build first? <span>Optional</span><textarea rows={3} value={value.journey} maxLength={800} onChange={e => setValue(v => ({ ...v, journey: e.target.value }))} placeholder="For example, check eligibility, apply and track the application" /></label>
    <p className={s.note}>{existing ? "This creates a new version. Your current prototype stays available if generation fails." : "You’ll get interactive screens with simulated data. You can refine them afterward."}</p>
    <div className={s.actions}><button type="button" onClick={onCancel}>Back</button><button type="submit" disabled={!value.platform}>{existing ? "Rebuild prototype" : "Build prototype"} <span aria-hidden="true">→</span></button></div>
  </form>;
}

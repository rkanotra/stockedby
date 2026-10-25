"use client";
import { useState } from "react";
import { PROTOTYPE_PLATFORMS } from "@/lib/studio/prototype-settings";
import s from "./prototype-setup.module.css";

export default function PrototypeSetup({ settings, existing, processFlow, onSubmit, onCancel }) {
  const [value, setValue] = useState({ platform: "", audience: "", journey: "", dataScope: "personal", ...settings });
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
    <fieldset className={s.experiences}>
      <legend>Whose records should appear?</legend>
      <label><input type="radio" name="prototype-data-scope" checked={value.dataScope === "personal"} onChange={() => setValue(v => ({...v,dataScope:"personal"}))}/><span><strong>Personal journey</strong><small>One person’s application, booking or request.</small></span></label>
      <label><input type="radio" name="prototype-data-scope" checked={value.dataScope === "workspace"} onChange={() => setValue(v => ({...v,dataScope:"workspace"}))}/><span><strong>Staff workspace</strong><small>A fictional queue of records for an internal team.</small></span></label>
    </fieldset>
    {processFlow?.items?.length > 0 && <details className={s.processFlow}><summary>Use your process flow · {processFlow.items.length} steps</summary><p>These steps will guide the screens and their decision paths. Use the journey field below to narrow the scope.</p><ol>{processFlow.items.map(item => <li key={item.id}><strong>{item.title}</strong><p>{item.detail}</p></li>)}</ol></details>}
    <label className={s.field}>Who is this for? <span>Optional</span><input value={value.audience} maxLength={160} onChange={e => setValue(v => ({ ...v, audience: e.target.value }))} placeholder="For example, customers applying for a loan" /></label>
    <label className={s.field}>Which journey should we build first? <span>Optional</span><textarea rows={3} value={value.journey} maxLength={800} onChange={e => setValue(v => ({ ...v, journey: e.target.value }))} placeholder="For example, check eligibility, apply and track the application" /></label>
    <p className={s.note}>{existing ? "This creates a new version. Your current prototype stays available if generation fails." : "You’ll get interactive screens with simulated data. You can refine them afterward."}</p>
    <div className={s.actions}><button type="button" onClick={onCancel}>Back</button><button type="submit" disabled={!value.platform}>{existing ? "Rebuild prototype" : "Build prototype"} <span aria-hidden="true">→</span></button></div>
  </form>;
}

"use client";
import { useState } from 'react';
import s from './ascent.module.css';
export default function Account({email}) {
  const [password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[currentPassword,setCurrentPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  return <>
    <div className={s.pageHeading}><div><span className={s.kicker}>YOUR ACCOUNT</span><h1>Sign in on your terms.</h1><p>Set a password once. Use it with your email at home or in the office.</p></div></div>
    <section className={s.accountPanel}>
      <h2>Email &amp; password</h2><p>Signed in as <strong>{email}</strong></p>
      {saved ? <div role="status" className={s.notice}>Password saved. You can now sign in to stockedby.com/ascent with this email and your password. No email link is needed.<button className={s.textButton} onClick={()=>setSaved(false)}>Change password</button></div> :
      <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/ascent/auth',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({password,confirmPassword,currentPassword})});const d=await r.json();if(!r.ok)throw Error(d.error);setPassword('');setConfirmPassword('');setCurrentPassword('');setSaved(true);}catch(e){setError(e.message);}finally{setBusy(false);}}}>
        <input type="text" autoComplete="username" value={email} readOnly hidden />
        <label>Current password <small>Leave blank if you have only used email links.</small><input type="password" autoComplete="current-password" maxLength={128} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} /></label>
        <label>New password<input type="password" autoComplete="new-password" minLength={6} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} aria-describedby="password-help" /></label>
        <p id="password-help" className={s.fine}>At least 6 characters. Choose a password you do not use elsewhere.</p>
        <label>Confirm new password<input type="password" autoComplete="new-password" minLength={6} maxLength={128} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} /></label>
        <button className={s.primary} disabled={busy}>{busy?'Saving…':'Save password'}</button>
      </form>}
      {error&&<p role="alert" className={s.error}>{error}</p>}
      <div className={s.accountFooter}><p>Signing out here also signs out of the StockedBy team workspace in this browser.</p><button className={s.secondary} disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const r=await fetch('/api/team/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'signout'})});if(!r.ok)throw Error('Could not sign out. Please retry.');window.history.replaceState(window.history.state,'','/ascent');window.location.reload();}catch(e){setError(e.message);setBusy(false);}}}>Sign out</button></div>
    </section>
  </>;
}

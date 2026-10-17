"use client";
import { useRef } from "react";
import Icon from "./Icon";
import s from "./inputs.module.css";
export const INPUT_ACCEPT = ".pdf,.docx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp";
export default function ProjectInputs({ project, busy, shared, demo, upload, paste, edit, updateBrief, next, standards }) {
  const picker = useRef(null);
  const sources = project.sources.filter(source => source.kind === "context");
  return <section className={s.page} aria-label="Project inputs">
    <div className={s.journey} aria-label="Project stages">
      <span aria-current="step"><b>1</b> Bring your inputs</span><i>→</i>
      <button onClick={next}><b>2</b> Choose your outputs</button><i>→</i>
      <span><b>3</b> Review with your team</span>
    </div>
    <div className={s.heading}><h1>Start with your existing work.</h1><p>Add a BRD, discovery notes or screenshots. Then choose the documents and prototype you need.</p></div>
    <div className={s.grid}>
      <div className={s.materials}>
        <div className={s.drop} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }} onDrop={e => { e.preventDefault(); if (!busy) upload(e.dataTransfer.files); }}>
          <div className={s.fileIcons} aria-hidden="true"><span><Icon name="brief" size={26} /></span><span><Icon name="screen" size={27} /></span><span><Icon name="flow" size={25} /></span></div>
          <h2>Drop your starting material here</h2>
          <p>BRDs & PRDs · Discovery & research · Screenshots & diagrams</p>
          <div className={s.actions}><button className={s.primary} disabled={busy} onClick={() => picker.current?.click()}><Icon name="upload" size={16} /> Choose a file</button><button disabled={busy} onClick={paste}>Paste notes <Icon name="plus" size={15} /></button></div>
          <input ref={picker} hidden type="file" aria-label="Upload project document or image" accept={INPUT_ACCEPT} disabled={busy} onChange={e => { upload(e.target.files); e.target.value = ""; }} />
          <small>PDF, DOCX, TXT, MD, CSV, JSON, PNG, JPG, WebP · 3 MB per file<br />Add one file at a time. Review its contents before adding it.</small>
        </div>
        <p className={s.processing}><Icon name="spark" size={15} /><span>Images are sent to OpenAI to read text and diagrams. You check the extracted notes. Original files are not retained.</span></p>
        <div className={s.listHeading}><h2>Project material <span>{sources.length}</span></h2><small>{demo ? "Demo · changes stay in this tab" : shared ? "Added inputs autosave online" : "Saved in this browser"}</small></div>
        {sources.length ? <div className={s.sourceList}>{sources.map(source => <button key={source.id} onClick={() => edit(source)} disabled={busy}>
          <span className={s.sourceIcon}><Icon name={/\.(png|jpe?g|webp)$/i.test(source.name) ? "screen" : "brief"} size={19} /></span>
          <span><strong>{source.name}</strong><small>{source.text.slice(0, 95).replace(/\n/g, " ")}{source.text.length > 95 ? "…" : ""}</small></span><span className={s.edit}>View & edit <Icon name="arrow" size={14} /></span>
        </button>)}</div> : <div className={s.empty}><Icon name="folder" size={20} /><p>Your existing work belongs here.<small>Add a file or paste notes. There’s no required document template.</small></p></div>}
      </div>
      <aside className={s.aside}>
        <section className={s.note}><div className={s.noteTitle}><Icon name="edit" size={18} /><h2>A little direction</h2><span>Optional</span></div><p>What do you want to build or change? Add anything your files don’t explain.</p><label htmlFor="project-direction">Project goal</label><textarea id="project-direction" rows={7} maxLength={16000} disabled={busy} value={project.brief} onChange={e => updateBrief(e.target.value)} placeholder="For example: simplify onboarding for our business customers. Use the attached discovery notes and existing BRD as the starting point." /><small>Already covered in your documents? Leave this blank.</small></section>
        <button className={s.standards} onClick={standards}><Icon name="shield" size={21} /><span><strong>Company policies & standards</strong><small>Keep the rules your team must follow together.</small></span><Icon name="arrow" size={16} /></button>
        <div className={s.next}><span>NEXT, MAKE IT YOURS</span><h2>Build only what you need.</h2><p>Choose requirements, user stories, a working prototype or any combination. A new product brief is optional.</p><button className={s.primary} onClick={next}>Choose outputs <Icon name="arrow" size={16} /></button></div>
      </aside>
    </div>
    <p className={s.footnote}>Project inputs inform every AI draft. Adding or changing material marks existing outputs for review.</p>
  </section>;
}

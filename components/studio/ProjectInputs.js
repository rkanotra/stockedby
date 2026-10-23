"use client";
import { useRef } from "react";
import Icon from "./Icon";
import s from "./inputs.module.css";
export const INPUT_ACCEPT = ".pdf,.docx,.xlsx,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp";
export default function ProjectInputs({ project, busy, shared, demo, upload, paste, edit, updateBrief, next, standards, hasPrd, canCreate, workflow }) {
  const picker = useRef(null);
  const sources = project.sources.filter(source => source.kind === "context");
  return <section className={s.page} aria-label="Project inputs">
    <div className={s.journey} aria-label="Project stages">
      <span aria-current="step"><b>1</b> Bring your inputs</span><i>→</i>
      <span><b>2</b> Create your PRD</span><i>→</i>
      <span><b>3</b> Read, edit & download</span>
    </div>
    <div className={s.heading}><h1>Your inputs. One clear PRD.</h1><p>Add the work you already have. We’ll turn it into a product requirements document you can read and edit right here.</p></div>
    <div className={s.grid}>
      <div className={s.materials}>
        <div className={s.drop} onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }} onDrop={e => { e.preventDefault(); if (!busy) upload(e.dataTransfer.files); }}>
          <div className={s.fileIcons} aria-hidden="true"><span><Icon name="brief" size={26} /></span><span><Icon name="screen" size={27} /></span><span><Icon name="flow" size={25} /></span></div>
          <h2>Drop your starting material here</h2>
          <p>BRDs & PRDs · Discovery notes · Excel sheets · Screenshots</p>
          <div className={s.actions}><button className={s.primary} disabled={busy} onClick={() => picker.current?.click()}><Icon name="upload" size={16} /> Choose a file</button><button disabled={busy} onClick={paste}>Paste notes <Icon name="plus" size={15} /></button></div>
          <input ref={picker} hidden type="file" aria-label="Upload project document or image" accept={INPUT_ACCEPT} disabled={busy} onChange={e => { upload(e.target.files); e.target.value = ""; }} />
          <small>PDF, DOCX, XLSX, TXT, MD, CSV, JSON, PNG, JPG, WebP · 3 MB per file<br />Add one file at a time. Review its contents before adding it.</small>
        </div>
        <p className={s.processing}><Icon name="spark" size={15} /><span>Uploading adds source material; it does not create a document. Excel imports visible cell values and saved formula results. Images are read by AI. Original files are not retained.</span></p>
        <div className={s.listHeading}><h2>Project material <span>{sources.length}</span></h2><small>{demo ? "Demo · changes stay in this tab" : shared ? "Added inputs autosave online" : "Saved in this browser"}</small></div>
        {sources.length ? <div className={s.sourceList}>{sources.map(source => <button key={source.id} onClick={() => edit(source)} disabled={busy}>
          <span className={s.sourceIcon}><Icon name={/\.(png|jpe?g|webp)$/i.test(source.name) ? "screen" : "brief"} size={19} /></span>
          <span><strong>{source.name}</strong><small>{source.text.slice(0, 95).replace(/\n/g, " ")}{source.text.length > 95 ? "…" : ""}</small></span><span className={s.edit}>View & edit <Icon name="arrow" size={14} /></span>
        </button>)}</div> : <div className={s.empty}><Icon name="folder" size={20} /><p>Your existing work belongs here.<small>Add a file or paste notes. There’s no required document template.</small></p></div>}
      </div>
      <aside className={s.aside}>
        <div className={s.next}><span>{hasPrd ? "YOUR PRD IS SAVED" : "WHEN YOUR INPUTS ARE READY"}</span><h2>{hasPrd ? "Continue your PRD." : "Create your PRD."}</h2><p>{hasPrd ? "Open the full document to read, edit, update or download it." : "Get the problem, scope, requirements, acceptance criteria and open questions in one document."}</p><button className={s.primary} disabled={busy || (!hasPrd && !canCreate)} onClick={next}>{hasPrd ? "Open your PRD" : "Create PRD"} <Icon name="arrow" size={16} /></button><small>{!hasPrd && !canCreate ? "Add a file or at least 20 characters of project context to begin." : "Your document opens automatically. Review AI drafts before sharing."}</small></div>
        <section className={s.note}><div className={s.noteTitle}><Icon name="edit" size={18} /><h2>What are you building?</h2><span>Optional</span></div><p>Add anything your files don’t explain, or describe your idea to start without a file.</p><label htmlFor="project-direction">Project goal</label><textarea id="project-direction" rows={5} maxLength={16000} disabled={busy} value={project.brief} onChange={e => updateBrief(e.target.value)} placeholder="For example: simplify onboarding for our business customers. Use the attached discovery notes and existing BRD as the starting point." /><small>Already covered in your documents? Leave this blank.</small></section>
        <button className={s.standards} onClick={standards}><Icon name="shield" size={21} /><span><strong>Company policies & standards</strong><small>Keep the rules your team must follow together.</small></span><Icon name="arrow" size={16} /></button>
        <button className={s.standards} onClick={workflow}><Icon name="flow" size={21}/><span><strong>Need other outputs?</strong><small>Optional workflows for stories, tests and prototypes.</small></span><Icon name="arrow" size={16}/></button>
      </aside>
    </div>
    <p className={s.footnote}>Project inputs inform every AI draft. Adding or changing material marks existing outputs for review.</p>
  </section>;
}

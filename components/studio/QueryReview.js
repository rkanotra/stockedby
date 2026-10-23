"use client";
import { useState } from "react";
import { documentQueries, queryKey, readQueryResolutions } from "@/lib/studio/queries";
import s from "./query-review.module.css";

function QueryCard({ query, busy, onResolve, historical = false }) {
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState(query.resolution?.answer || "");
  const label = query.kind === "question" ? "Question" : { blocker: "Blocker", warning: "Warning", note: "Note" }[query.severity] || "Finding";
  return <article className={s.card} aria-label={query.text}>
    <div className={s.meta}><span className={query.severity === "blocker" ? s.blocker : ""}>{label}</span><span>{query.status === "answered" ? "Answer saved" : query.status === "ignored" ? "Ignored" : "Open"}</span></div>
    <p className={s.question}>{query.text}</p>
    {query.expired && <p className={s.hint}>Project inputs changed. Review this query again.</p>}
    {query.status === "answered" && !editing && <div className={s.answer}><strong>Your answer</strong><p>{query.resolution.answer}</p></div>}
    {query.status === "ignored" && <p className={s.hint}>Deferred by you. This is not a confirmed fact or a resolved risk.</p>}
    {editing ? <form onSubmit={e => { e.preventDefault(); if (!answer.trim() || busy) return; onResolve(query, "answered", answer); setEditing(false); }}>
      <label className={s.label}>Your answer<textarea autoFocus aria-label={`Answer: ${query.text}`} maxLength={2000} rows={3} value={answer} disabled={busy} onChange={e => setAnswer(e.target.value)} placeholder="Add the decision, detail or clarification for this item."/></label>
      <div className={s.actions}><button className={s.primary} disabled={busy || !answer.trim()} type="submit">Save answer</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</button></div>
    </form> : <div className={s.actions}>
      <button disabled={busy} onClick={() => { setAnswer(query.resolution?.answer || ""); setEditing(true); }}>{query.status === "answered" ? "Edit answer" : "Answer"}</button>
      {query.status === "open" ? <button disabled={busy} onClick={() => onResolve(query, "ignored")}>Ignore</button> : <button disabled={busy} onClick={() => onResolve(query, "open")}>{historical ? "Remove saved decision" : "Reopen"}</button>}
    </div>}
  </article>;
}
export default function QueryReview({ project, node, busy, configured, onResolve, onUpdate }) {
  const queries = documentQueries(project, node);
  const open = queries.filter(q => q.status === "open");
  const saved = queries.filter(q => q.status !== "open");
  const history = readQueryResolutions(project.queryResolutions).filter(r => r.nodeId === node.id && !queries.some(q => q.key === queryKey(node.id, r))).map(r => ({ ...r, key: queryKey(node.id, r), resolution: r }));
  if (!queries.length && !history.length) return null;
  return <section className={s.review} aria-label="Questions and decisions">
    <div className={s.header}><div><h2>Questions & decisions</h2><p>Answer or ignore each item here. You can continue with open questions.</p></div><span className={s.count}>{open.length} open</span></div>
    {open.map(q => <QueryCard key={q.key} query={q} busy={busy} onResolve={onResolve}/>)}
    {saved.length + history.length > 0 && <details className={s.saved}><summary>{saved.length + history.length} saved answers & ignored queries</summary>{saved.map(q => <QueryCard key={q.key} query={q} busy={busy} onResolve={onResolve}/>)}{history.map(q => <QueryCard key={q.key} query={q} busy={busy} onResolve={onResolve} historical/>)}</details>}
    <div className={s.update}><p>Saved answers become context for the next step. Update this document to apply them to its text.</p><button className={s.primary} disabled={busy || configured === false} onClick={onUpdate}>{busy ? "Working…" : node.type === "requirements" ? "Update PRD" : "Update document"}</button></div>
  </section>;
}

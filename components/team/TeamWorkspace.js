"use client";
import { initialDocument } from "@/lib/studio/navigation";
import { planMarkdown } from "@/lib/studio/product-plan";
import Link from "next/link";
import Markdown from "react-markdown";
import { prototypeHtml } from "@/lib/studio/prototypeRuntime";
import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../studio/Icon";
import Studio from "../studio/Studio";
import { newProject, parseProjectFile, TYPE } from "@/lib/studio/model";
import { demoProject } from "@/lib/studio/demo";
import { teamDemo } from "@/lib/team/demo";
import { applyProposal } from "@/lib/team/changes";
import s from "./team.module.css";
const empty = { workspaces: [], projects: [], changes: [], members: [], comments: [], events: [], invites: [] };
const date = value => new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const initials = value => (value || "?").split("@")[0].slice(0, 2).toUpperCase();
async function api(path = "", body) {
  const response = await fetch(`/api/team${path}`, { method: body ? "POST" : "GET", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw Object.assign(Error(data.error || "Could not connect. Please try again."), { status: response.status });
  return data;
}
function Avatar({ email, index = 0 }) { return <span className={`${s.avatar} ${s[`avatar${index % 3}`]}`} title={email}>{initials(email)}</span>; }
function Brand() { return <Link href="/" className={s.brand}><span>s↗</span>stockedby<span className={s.brandDot}>.</span></Link>; }
function Pill({ children, tone = "neutral" }) { return <span className={`${s.pill} ${s[tone]}`}>{children}</span>; }
export default function TeamWorkspace() {
  const [data, setData] = useState(empty), [user, setUser] = useState(null), [configured, setConfigured] = useState(null);
  const [workspaceId, setWorkspaceId] = useState(""), [view, setView] = useState("overview"), [projectId, setProjectId] = useState(null), [changeId, setChangeId] = useState(null);
  const [demo, setDemo] = useState(false), [loading, setLoading] = useState(true), [busy, setBusy] = useState(""), [error, setError] = useState(""), [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState(null), [selectedNodeId, setSelectedNodeId] = useState(null), [email, setEmail] = useState(""), [sent, setSent] = useState(false), [name, setName] = useState("");
  const [request, setRequest] = useState(""), [comment, setComment] = useState(""), [anchor, setAnchor] = useState("initiative"), [note, setNote] = useState("");
  const [inviteRole, setInviteRole] = useState("editor"), [inviteLink, setInviteLink] = useState(""), [joinToken, setJoinToken] = useState("");
  const [search, setSearch] = useState(""), [editor, setEditor] = useState(null), [draft, setDraft] = useState(null), [dirty, setDirty] = useState(false), [conflict, setConflict] = useState(false), [editorEpoch, setEditorEpoch] = useState(0);
  const file = useRef(null), dialog = useRef(null), refreshing = useRef(false), draftRef = useRef(null), savingLock = useRef(false);
  const [editorBusy, setEditorBusy] = useState(null);
  const editorBar = useRef(null);
  const [editorLocation, setEditorLocation] = useState({ tab: null, nodeId: null });
  const [saving, setSaving] = useState(false), [saveFailed, setSaveFailed] = useState(false);
  const workspace = data.workspaces.find(w => w.id === workspaceId);
  const member = data.members.find(m => m.user_id === user?.id), role = member?.role;
  const canEdit = demo || ["owner", "editor"].includes(role), canReview = demo || ["owner", "reviewer"].includes(role);
  const project = data.projects.find(p => p.id === projectId), change = data.changes.find(c => c.id === changeId);
  const selectedNode = project?.document.nodes.find(n => n.id === selectedNodeId);
  const pending = data.changes.filter(c => c.status === "pending");
  const emailFor = id => data.members.find(m => m.user_id === id)?.email || "Former teammate";
  const load = useCallback(async (wid) => {
    const fresh = await api(wid ? `?workspace=${encodeURIComponent(wid)}` : "");
    setData({ ...empty, ...fresh });
    return fresh;
  }, []);
  function projectUrl(row, tab = "documents", nodeId = "") {
    const hash = new URLSearchParams({ workspace: row.workspace_id || workspaceId, project: row.id, view: tab });
    if (nodeId) hash.set("document", nodeId);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${hash}`);
  }
  function startEditor(row, nodeId = null, tab = null) {
    const target = row.document.nodes.find(n => n.id === nodeId) || initialDocument(row.document);
    const location = { nodeId: target?.id || null, tab: tab || (target ? target.type === "prototype" ? "prototype" : "documents" : "inputs") };
    setEditorLocation(location); setEditor(structuredClone(row)); setDraft(row.document); draftRef.current = row.document;
    setDirty(false); setConflict(false); setSaveFailed(false); setError(""); setModal(null);
    setProjectId(row.id); setAnchor("initiative");
    projectUrl(row, location.tab, location.nodeId);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function restoreProject(fresh, account, isDemo = false) {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const row = fresh.projects.find(p => p.id === hash.get("project"));
    if (!row) return;
    setProjectId(row.id);
    const tab = hash.get("view");
    if (tab === "team") { setView("initiative"); return; }
    if (isDemo || ["owner", "editor"].includes(fresh.members.find(m => m.user_id === account.id)?.role)) {
      startEditor(row, hash.get("document"), ["inputs", "documents", "prototype", "plan", "canvas", "review", "connections", "standards", "trace"].includes(tab) ? tab : null);
    } else {
      const node = row.document.nodes.find(n => n.id === hash.get("document") && n.artifact) || initialDocument(row.document);
      setSelectedNodeId(node?.id || null); setView(node ? "document" : "initiative");
    }
  }
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") {
      // Hydrate the explicitly selected, fictional preview.
      const sample = teamDemo(), account = { id: "maya", email: "maya@example.com" };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDemo(true); setData(sample); setUser(account); setWorkspaceId("demo"); setConfigured(false); setLoading(false); restoreProject(sample, account, true); return;
    }
    let token = params.get("invite") || "";
    try {
      token ||= localStorage.getItem("stockedby-team-invite") || "";
      if (token) localStorage.setItem("stockedby-team-invite", token);
    } catch { /* Sign-in still works when browser storage is unavailable. */ }
    if (token) { setJoinToken(token); window.history.replaceState(null, "", "/workspace"); }
    if (params.has("authError")) setError("That sign-in link expired or was opened in another browser. Request a new link and open it here.");
    (async () => {
      try {
        const auth = await api("/auth"); if (!active) return;
        setConfigured(auth.configured); setUser(auth.user);
        if (auth.user) { const list = await load(); if (active && list.workspaces.length) { const requested = new URLSearchParams(window.location.hash.slice(1)).get("workspace"); const wid = list.workspaces.find(w => w.id === requested)?.id || list.workspaces[0].id; setWorkspaceId(wid); const fresh = await load(wid); if (active) restoreProject(fresh, auth.user); } }
      } catch (e) { if (active) setError(e.message); } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  // Restore the route once from the authenticated mount-time snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);
  useEffect(() => {
    const bar = editorBar.current;
    if (!bar) return;
    const resize = new ResizeObserver(() => bar.parentElement.style.setProperty("--workspace-toolbar-offset", `${bar.getBoundingClientRect().height}px`));
    resize.observe(bar);
    return () => resize.disconnect();
  }, [editor?.id]);
  useEffect(() => {
    if (demo || !workspaceId || !user || editor) return;
    const refresh = async () => {
      if (document.hidden || refreshing.current) return;
      refreshing.current = true;
      try { await load(workspaceId); } catch (e) { setError(e.message); } finally { refreshing.current = false; }
    };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [demo, workspaceId, user, editor, load]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => { previous?.focus(); };
  }, [modal]);
  async function perform(label, fn) {
    if (busy) return;
    setBusy(label); setError("");
    try { await fn(); } catch (e) { setError(e.message); if (e.status === 409) setConflict(true); } finally { setBusy(""); }
  }
  async function mutate(action, args = {}) {
    const result = await api("", { action, workspaceId, ...args });
    await load(workspaceId);
    return result.result;
  }
  function openProject(row, nodeId = null) {
    setProjectId(row.id); setChangeId(null); setAnchor("initiative");
    if (canEdit) { startEditor(row, nodeId); return; }
    const node = row.document.nodes.find(n => n.id === nodeId && n.artifact) || initialDocument(row.document);
    setSelectedNodeId(node?.id || null); setView(node ? "document" : "initiative");
    projectUrl(row, node ? "document" : "team", node?.id);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function openTeamContext(row) { setProjectId(row.id); setView("initiative"); setAnchor("initiative"); projectUrl(row, "team"); window.scrollTo({ top: 0, behavior: "instant" }); }
  async function leaveEditor(toTeam = false) {
    if (dirty && !(await saveDraft())) return;
    setEditor(null); setDraft(null); draftRef.current = null; setSaveFailed(false);
    if (toTeam) openTeamContext(editor);
    else { setView("overview"); window.history.replaceState(null, "", window.location.pathname + window.location.search); window.scrollTo({ top: 0, behavior: "instant" }); }
  }
  function openChange(row) { setChangeId(row.id); setProjectId(row.project_id); setView("change"); setAnchor("review"); setNote(""); }
  function openModal(kind) { setModal(kind); setName(""); setEmail(""); setInviteLink(""); }
  function downloadDraft() {
    const a = document.createElement("a"); const url = URL.createObjectURL(new Blob([JSON.stringify({ format: "stockedby-studio", version: 1, project: draft || editor?.document }, null, 2)], { type: "application/json" }));
    a.href = url; a.download = "stockedby-draft.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const saveDraft = useCallback(async () => {
    if (!editor || !dirty || conflict || busy || savingLock.current) return false;
    const document = draftRef.current || draft;
    if (!document) return false;
    savingLock.current = true;
    setSaving(true); setSaveFailed(false); setError("");
    try {
      // Do not couple a successful write to a later refresh request. A failed
      // refresh must not leave our base version behind the committed version.
      const result = demo ? { version: editor.version + 1 } : (await api("", {
        action: "save_project", workspaceId, projectId: editor.id, version: editor.version, document,
      })).result;
      const saved = { ...editor, document, version: result.version, updated_at: new Date().toISOString() };
      setEditor(saved);
      setData(d => ({ ...d, projects: d.projects.map(p => p.id === saved.id ? saved : p) }));
      const current = draftRef.current === document;
      setDirty(!current); setConflict(false);
      return current;
    } catch (e) {
      setSaveFailed(true);
      setConflict(e.status === 409);
      setError(e.status === 409 ? "A teammate saved a newer version. Your draft is intact. Download it before loading their changes." : `Not saved online. ${e.message} Your draft is still open; retry or download a backup.`);
      return false;
    } finally {
      savingLock.current = false;
      setSaving(false);
    }
  }, [editor, dirty, conflict, busy, draft, demo, workspaceId]);
  useEffect(() => {
    if (!editor || !dirty || saving || busy || conflict || saveFailed) return;
    const timer = setTimeout(() => { void saveDraft(); }, 1500);
    return () => clearTimeout(timer);
  }, [editor, draft, dirty, saving, busy, conflict, saveFailed, saveDraft]);
  async function createProject(document) {
    if (demo) {
      const row = { id: crypto.randomUUID(), workspace_id: "demo", document, version: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), updated_by: user.id };
      setData(d => ({ ...d, projects: [row, ...d.projects] })); openProject(row);
    } else { const result = await mutate("create_project", { document }); startEditor({ ...result, workspace_id: workspaceId, document, version: result.version || 1 }); }
    setModal(null);
  }
  async function submitComment(event) {
    event.preventDefault();
    await perform("Posting comment", async () => {
      if (demo) setData(d => ({ ...d, comments: [...d.comments, { id: crypto.randomUUID(), project_id: projectId, change_id: view === "change" ? changeId : null, anchor, body: comment, created_by: user.id, created_at: new Date().toISOString() }] }));
      else await mutate("comment", { projectId, changeId: view === "change" ? changeId : null, anchor, body: comment });
      setComment("");
    });
  }
  async function decide(decision) {
    await perform("Saving review decision", async () => {
      if (demo) setData(d => ({ ...d, projects: d.projects.map(p => p.id === project.id && decision === "applied" ? { ...p, document: applyProposal(p.document, change.proposal), version: p.version + 1 } : p), changes: d.changes.map(c => c.id === change.id ? { ...c, status: decision, decided_by: user.id, decided_at: new Date().toISOString(), decision_note: note } : c), events: [{ id: crypto.randomUUID(), actor_id: user.id, message: decision === "applied" ? "Approved and applied a change proposal" : "Requested revisions", created_at: new Date().toISOString() }, ...d.events] }));
      else await mutate("decide", { changeId, decision, note });
      setNotice(decision === "applied" ? "Approved edits applied. Review prototype behaviour and downstream outputs before delivery." : "Revisions requested. Your explanation is saved with the review.");
    });
  }
  const discussion = () => <section className={s.discussion}>
    <div className={s.sectionHeading}><h3>Team discussion</h3><span>{data.comments.filter(c => c.project_id === projectId && (view !== "change" || c.change_id === changeId)).length}</span></div>
    {data.comments.filter(c => c.project_id === projectId && (view !== "change" || c.change_id === changeId)).map(c => <article className={s.comment} key={c.id}><Avatar email={emailFor(c.created_by)} /><div><strong>{emailFor(c.created_by).split("@")[0]}</strong><small>{date(c.created_at)} · {c.anchor}{c.resolved_at ? " · Resolved" : ""}</small><p>{c.body}</p>{!c.resolved_at && role !== "viewer" && <button onClick={() => perform("Resolving discussion", async () => { if (demo) setData(d => ({ ...d, comments: d.comments.map(x => x.id === c.id ? { ...x, resolved_at: new Date().toISOString() } : x) })); else await mutate("resolve_comment", { commentId: c.id }); })}>Resolve</button>}</div></article>)}
    {!data.comments.some(c => c.project_id === projectId && (view !== "change" || c.change_id === changeId)) && <p className={s.muted}>Keep the conversation beside the work. Questions, alternatives and decisions belong here.</p>}
    {role !== "viewer" && <form onSubmit={submitComment} className={s.commentForm}><label>Attach to<select value={anchor} onChange={e => setAnchor(e.target.value)}><option value={view === "change" ? "review" : "initiative"}>{view === "change" ? "Whole review" : "Initiative"}</option>{view === "change" ? change?.proposal.patches.map(p => <option key={p.id} value={p.id}>{p.label}</option>) : project?.document.nodes.filter(n => n.artifact).map(n => <option key={n.id} value={n.id}>{n.artifact.title}</option>)}</select></label><textarea aria-label="Discussion comment" placeholder="Add context or ask a specific question…" value={comment} maxLength={4000} onChange={e => setComment(e.target.value)} required /><button className={s.secondary} disabled={!!busy || !comment.trim()}>Post comment <Icon name="arrow" size={15} /></button></form>}
  </section>;
  if (loading) return <div className={s.loading}><Brand /><span className={s.spinner} /><p>Opening your team workspace…</p></div>;
  if (!user) return <div className={s.auth}><div className={s.authStory}><Brand /><div><span className={s.eyebrow}>A SHARED PLACE TO MOVE PRODUCT FORWARD</span><h1>Good work.<br />Better together<span>.</span></h1><p>The context. The decisions. The change everyone needs to see. Bring your product team onto the same page.</p><div className={s.authDiagram}><div><Icon name="brief" />Requirements<span>Version 3</span></div><i /><div><Icon name="spark" />AI change review<span>3 proposed edits</span></div><i /><div><Icon name="check" />Team decision<span>Ready for review</span></div></div></div><small>Shared initiatives · Source-backed changes · Human decisions</small></div><main className={s.authForm}><span className={s.eyebrow}>STOCKEDBY FOR TEAMS</span><h2>Your next chapter<br />starts here.</h2><p>Sign in with your work email. We’ll send you a secure link.</p>{error && <div className={s.error} role="alert">{error}</div>}{configured === false && <div className={s.setupNote}><Icon name="shield" /><div><strong>Team workspace setup is in progress</strong><p>Explore the experience now. Shared saving and sign-in become available when the database is connected.</p></div></div>}{sent ? <div className={s.success}><Icon name="check" /><h3>Check your inbox</h3><p>Open the link sent to <strong>{email}</strong> in this browser. It expires shortly.</p><button className={s.textButton} onClick={() => setSent(false)}>Use another email</button></div> : <form onSubmit={e => { e.preventDefault(); perform("Sending sign-in link", async () => { await api("/auth", { action: "signin", email }); setSent(true); }); }}><label>Work email<input type="email" required autoComplete="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} /></label><button className={s.primary} disabled={!!busy || !configured}>{busy || "Continue with email"}<Icon name="arrow" size={17} /></button></form>}<div className={s.authLinks}><Link href="/workspace?demo=1">Explore the team demo <Icon name="arrow" size={15} /></Link><Link href="/studio">Continue in your local studio</Link></div><small>By signing in, you can create a private workspace or accept a team invitation. <Link href="/privacy">Privacy details</Link></small></main></div>;
  if (editor) return <div className={s.editorWrap}>
    <header className={s.editorBar} ref={editorBar}>
      <div className={s.editorNavigation}>
        <button className={s.textButton} disabled={saving || !!busy || !!editorBusy} onClick={() => leaveEditor()}>← Projects</button>
        <span aria-hidden="true">/</span><strong>{draft?.name || editor.document.name}</strong>
      </div>
      <span role="status">{conflict ? "Save paused · newer team version" : saving ? (demo ? "Saving demo…" : "Saving online…") : saveFailed ? "Not saved online · retry needed" : dirty ? "Changes pending · autosaving…" : demo ? `Demo saved in this tab · v${editor.version}` : `Saved online · version ${editor.version}`}</span>
      <div><button className={s.secondary} disabled={saving || !!busy || !!editorBusy} onClick={() => leaveEditor(true)}>Discussion & changes</button>{(saveFailed || conflict) && <button className={s.secondary} onClick={downloadDraft}>Download backup</button>}<button className={s.primary} onClick={saveDraft} disabled={!dirty || saving || !!busy || conflict}>{saving ? "Saving…" : saveFailed ? "Retry save" : "Save now"}</button></div>
    </header>
    {error && <div className={s.error} role="alert">{error}{conflict && <button className={s.textButton} onClick={() => perform("Reloading initiative", async () => {
      downloadDraft(); const fresh = await load(workspaceId); const latest = fresh.projects.find(p => p.id === editor.id);
      if (!latest) throw Error("This initiative is no longer accessible. Your downloaded draft contains your work.");
      setEditor(latest); setEditorEpoch(e => e + 1); setDraft(latest.document); draftRef.current = latest.document;
      setDirty(false); setConflict(false); setSaveFailed(false); setError("");
    })}>Download my draft & reload latest</button>}</div>}
    <Studio key={`${editor.id}-${editorEpoch}`} shared={{ project: editor.document, demo,
      initialNodeId: editorLocation.nodeId, initialView: editorLocation.tab,
      onNavigate: ({ tab, nodeId }) => projectUrl(editor, tab, nodeId),
      onBusyChange: setEditorBusy,
      onChange: p => { draftRef.current = p; setDraft(p); setDirty(true); },
      name: workspace?.name || "Team workspace" }} />
  </div>;
  return <div className={s.app}>
    <aside className={s.sidebar}><Brand /><div className={s.workspaceSwitch}><span className={s.workspaceMark}><Icon name="layers" /></span><div><small>TEAM WORKSPACE</small><select aria-label="Team workspace" value={workspaceId} onChange={e => perform("Opening workspace", async () => { const id = e.target.value; setWorkspaceId(id); setView("overview"); setProjectId(null); setChangeId(null); await load(id); })}>{data.workspaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}{!data.workspaces.length && <option value="">Your workspace</option>}</select></div></div>
      <nav aria-label="Team navigation">{[["overview", "Projects", "folder"], ["inbox", "Proposed changes", "spark"], ["team", "People & access", "shield"]].map(([key, label, icon]) => <button key={key} className={view === key || (key === "overview" && ["initiative", "document", "initiatives"].includes(view)) || (key === "inbox" && view === "change") ? s.navActive : ""} onClick={() => { setView(key); setSearch(""); window.history.replaceState(null, "", window.location.pathname + window.location.search); }}><Icon name={icon} size={18} />{label}{key === "inbox" && pending.length > 0 && <b>{pending.length}</b>}</button>)}</nav>
      <div className={s.sideProjects}><span className={s.eyebrow}>YOUR PROJECTS</span>{data.projects.slice(0, 5).map(p => <button key={p.id} onClick={() => openProject(p)}><i />{p.document.name}</button>)}{!data.projects.length && <p>Give your next idea<br />a shared home.</p>}</div>
      <div className={s.sideBottom}><div className={s.teamNote}><Icon name="shield" size={17} /><span>{demo ? "A fictional team. A real walkthrough." : "Private to your workspace."}<small>{demo ? "Changes stay in this tab." : "AI proposes. Your team decides."}</small></span></div><div className={s.identity}><Avatar email={user.email} /><div><strong>{user.email.split("@")[0]}</strong><small>{demo ? "Demo reviewer" : role || "Signed in"}</small></div>{demo ? <Link href="/workspace" aria-label="Leave demo">↗</Link> : <button title="Sign out" onClick={() => perform("Signing out", async () => { await api("/auth", { action: "signout" }); setUser(null); setData(empty); setWorkspaceId(""); })}>↗</button>}</div></div>
    </aside>
    <main className={s.main}><header className={s.topbar}><span>{workspace?.name || "Welcome"}<i>/</i><strong>{view === "change" ? "Change review" : view === "initiative" ? "Discussion & changes" : view === "document" ? "Document" : ({ overview: "Projects", inbox: "Proposed changes", initiatives: "Projects", team: "People & access" })[view]}</strong></span><div><span className={s.connectionDot} />{demo ? "Interactive demo" : "Shared workspace"}<div className={s.avatarStack}>{data.members.slice(0, 3).map((m, i) => <Avatar key={m.user_id} email={m.email} index={i} />)}</div>{role === "owner" && <button className={s.secondary} onClick={() => openModal("invite")}>Invite teammate <Icon name="plus" size={14} /></button>}</div></header>
      {demo && <div className={s.demoBar}>FICTIONAL DEMO <span>Explore a team review. No live teammates or cloud saving.</span><Link href="/workspace">Create your workspace ↗</Link></div>}
      <div className={s.content}>{error && <div className={s.error} role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError("")}>×</button></div>}{notice && <div className={s.notice} role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice("")}>×</button></div>}{busy && <div className={s.busy} role="status"><span className={s.spinner} />{busy}…</div>}
      {joinToken && <div className={s.inviteBanner}><div><strong>You have a team invitation</strong><p>Join with the email address your workspace owner invited.</p></div><button className={s.primary} disabled={!!busy} onClick={() => perform("Joining workspace", async () => { const result = await api("", { action: "accept_invite", token: joinToken }); try { localStorage.removeItem("stockedby-team-invite"); } catch { /* Storage may be disabled. */ } setJoinToken(""); setWorkspaceId(result.result.id); await load(result.result.id); })}>Accept invitation</button></div>}
      {!workspace && <section className={s.welcome}><span className={s.heroIcon}><Icon name="layers" size={30} /></span><span className={s.eyebrow}>MAKE ROOM FOR YOUR TEAM</span><h1>A shared home for<br />your next big thing.</h1><p>Start with one initiative. Bring in your context, invite your teammates and make the next decision together.</p><button className={s.primary} onClick={() => openModal("workspace")}>Create a team workspace <Icon name="plus" size={17} /></button></section>}
      {workspace && ["overview", "initiatives"].includes(view) && <>
        <div className={s.pageHeading}><div><span className={s.eyebrow}>{"YOUR TEAM WORKSPACE"}</span><h1>{"Your projects"}</h1><p>{"Open a project to read, edit or continue building. Your work saves online."}</p></div>{canEdit && <button className={s.primary} onClick={() => openModal("project")}>New project <Icon name="plus" size={17} /></button>}</div>
        {pending.length > 0 && <button className={s.pendingChanges} onClick={() => setView("inbox")}><Icon name="spark" size={18}/><span><strong>{pending.length} proposed {pending.length === 1 ? "change" : "changes"} awaiting a decision</strong><small>Review the edits before your team applies them.</small></span><Icon name="arrow" size={18}/></button>}
        <div className={s.sectionHeading}><h2>All projects <span>{data.projects.length}</span></h2><input aria-label="Search initiatives" placeholder="Find an initiative…" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <div className={s.projectGrid}>{data.projects.filter(p => p.document.name.toLowerCase().includes(search.toLowerCase())).map((p, i) => { const count = data.changes.filter(c => c.project_id === p.id && c.status === "pending").length; return <article className={s.projectCardShell} key={p.id}><button className={s.projectCard} onClick={() => openProject(p)}><div><span className={`${s.projectIcon} ${s[`avatar${i % 3}`]}`}><Icon name="folder" size={24} /></span><Pill tone={count ? "amber" : "neutral"}>{count ? `${count} in review` : "In progress"}</Pill></div><h3>{p.document.name}</h3><p>{p.document.brief || "A new idea, ready to take shape."}</p><div className={s.documentDots}>{p.document.nodes.slice(0, 6).map(n => <span key={n.id} className={n.artifact ? s.dotComplete : ""} title={TYPE[n.type]?.label} />)}<small>{p.document.nodes.filter(n => n.artifact).length} documents</small></div><footer><span>{canEdit ? "Open project" : "Read project"} · {date(p.updated_at || p.created_at)}</span><Icon name="arrow" size={17} /></footer></button>{(demo || (role === "owner" && data.capabilities?.deleteProjects)) && <button className={s.deleteProject} aria-label={`Delete ${p.document.name}`} onClick={() => { setDeleting(structuredClone(p)); setError(""); setModal("delete"); }}><Icon name="trash" size={15} />Delete</button>}</article>; })}{canEdit && <button className={s.newCard} onClick={() => openModal("project")}><Icon name="plus" size={23} /><strong>New project</strong><span>Start with your documents or import existing work.</span></button>}</div>
        {view === "overview" && <section className={s.activity}><div className={s.sectionHeading}><h2>The latest, together.</h2><span>Workspace activity</span></div>{data.events.slice(0, 5).map(event => <div key={event.id}><Avatar email={emailFor(event.actor_id)} /><p><strong>{emailFor(event.actor_id).split("@")[0]}</strong> {event.message.toLowerCase()}</p><time>{date(event.created_at)}</time></div>)}{!data.events.length && <p className={s.muted}>The team’s decisions and updates will appear here.</p>}</section>}
      </>}
      {workspace && view === "inbox" && <><div className={s.pageHeading}><div><span className={s.eyebrow}>CHANGES WITH CONTEXT</span><h1>A clearer path<br />to a team decision.</h1><p>Inspect the difference. Discuss the details. Decide with confidence.</p></div><Pill tone="amber">{pending.length} awaiting review</Pill></div><div className={s.reviewList}>{data.changes.map(c => <button className={s.reviewRow} key={c.id} onClick={() => openChange(c)}><span className={s.reviewGlyph}><Icon name={c.status === "applied" ? "check" : "spark"} size={23} /></span><div><small>{data.projects.find(p => p.id === c.project_id)?.document.name} · v{c.base_version}</small><h3>{c.proposal.title}</h3><p>{c.proposal.patches.length} proposed edits · {emailFor(c.created_by).split("@")[0]}</p></div><Pill tone={c.status === "pending" ? "amber" : c.status === "applied" ? "green" : "neutral"}>{c.status === "rejected" ? "Revisions requested" : c.status}</Pill><Icon name="arrow" /></button>)}{!data.changes.length && <div className={s.empty}><Icon name="check" size={30} /><h3>No changes waiting in the wings.</h3><p>Open an initiative and describe a change to prepare your first review.</p></div>}</div></>}
      {workspace && view === "initiative" && project && <><div className={s.pageHeading}><div><span className={s.eyebrow}>SHARED PROJECT · VERSION {project.version}</span><h1>{project.document.name}</h1><p>{project.document.nodes.filter(n => n.artifact).length} documents · Updated {date(project.updated_at || project.created_at)}</p></div>{canEdit && <button className={s.secondary} onClick={() => openProject(project)}>Back to project <Icon name="arrow" size={17} /></button>}</div><div className={s.initiativeGrid}><div><section className={s.briefCard}><span className={s.eyebrow}>THE INTENT</span><h2>What we’re moving forward.</h2><p>{project.document.brief || "Your project documents contain the current context and decisions."}</p>{project.document.productPlan && <details className={s.documentBody}><summary>Read the living product plan</summary><Markdown>{planMarkdown(project.document)}</Markdown></details>}<div className={s.artifactList}>{project.document.nodes.map(n => <button disabled={!n.artifact} key={n.id} onClick={() => openProject(project, n.id)}><Icon name={TYPE[n.type]?.icon} /><span>{TYPE[n.type]?.label}</span><Pill>{n.artifact ? n.artifact.status === "stale" ? "Needs update" : "Open document" : "Not started"}</Pill><Icon name="arrow" size={14} /></button>)}</div></section>{discussion()}</div><div><section className={s.aiCard}><span className={s.aiGlyph}><Icon name="spark" size={25} /></span><span className={s.eyebrow}>PROPOSE AN EDIT</span><h2>Suggest a change</h2><p>Describe a focused change. AI checks the saved initiative and prepares exact text edits for a teammate to review.</p><form onSubmit={e => { e.preventDefault(); perform("Preparing evidence and proposed edits", async () => { if (demo) { setNotice("This is a fictional walkthrough. Sign in to run AI reviews on your own initiatives."); return; } const result = await api("/changes", { workspaceId, projectId, request }); await load(workspaceId); setChangeId(result.result.id); setView("change"); setAnchor("review"); setRequest(""); }); }}><textarea aria-label="Describe the change" placeholder="For example: keep the entered email when an invitation fails, and add a retry action…" value={request} onChange={e => setRequest(e.target.value)} minLength={10} maxLength={4000} required /><button className={s.primary} disabled={!!busy || !canEdit}><Icon name="spark" size={16} />Prepare proposed edits</button></form><small>Your saved context is sent to OpenAI. Nothing is applied automatically.</small></section><section className={s.sideCard}><h3>Reviews for this initiative</h3>{data.changes.filter(c => c.project_id === projectId).map(c => <button key={c.id} onClick={() => openChange(c)}><span>{c.proposal.title}</span><Icon name="arrow" size={15} /></button>)}{!data.changes.some(c => c.project_id === projectId) && <p>No change reviews yet.</p>}</section></div></div></>}
      {workspace && view === "change" && change && project && <><div className={s.pageHeading}><div><button className={s.back} onClick={() => openProject(project)}>← {project.document.name}</button><span className={s.eyebrow}>CHANGE REVIEW · BASE VERSION {change.base_version}</span><h1>{change.proposal.title}</h1><p>{change.proposal.summary}</p></div><Pill tone={change.status === "applied" ? "green" : "amber"}>{change.status === "rejected" ? "Revisions requested" : change.status === "applied" ? "Approved & applied" : "Awaiting a decision"}</Pill></div><div className={s.changeLayout}><div><div className={s.requestCard}><span className={s.eyebrow}>THE REQUEST · {emailFor(change.created_by).split("@")[0]}</span><p>{change.request}</p></div><div className={s.sectionHeading}><h2>The proposed difference <span>{change.proposal.patches.length}</span></h2><span>Originals stay intact until approval</span></div>{change.proposal.patches.map((p, i) => <article className={s.patch} key={p.id} id={p.id}><header><span>{String(i + 1).padStart(2, "0")}</span><h3>{p.label}</h3><button aria-label={`Discuss ${p.label}`} onClick={() => { setAnchor(p.id); document.getElementById("review-discussion")?.scrollIntoView({ behavior: "smooth" }); }}>Discuss ↗</button></header><div className={s.diff}><div><span>CURRENT · V{change.base_version}</span><p>{p.before || "Empty"}</p></div><div><span>PROPOSED</span><p>{p.after || "Remove this text"}</p></div></div><footer><Icon name="spark" size={15} /><p>{p.reason}</p></footer>{p.evidenceIds.length > 0 && <div className={s.evidence}>{p.evidenceIds.map(id => { const source = project.document.sources.find(x => x.id === id), rule = project.document.rules.find(x => x.id === id); return <details key={id}><summary><Icon name="link" size={13} />{source?.name || rule?.title || id}</summary><p>{source?.text || rule?.quote}</p></details>; })}</div>}</article>)}{!change.proposal.patches.length && <div className={s.empty}><h3>No edits proposed</h3><p>Read the findings and clarify the request before preparing another review.</p></div>}<div id="review-discussion">{discussion()}</div></div><aside className={s.reviewAside}><section className={s.decisionCard}><span className={s.eyebrow}>HUMAN IN THE LOOP</span><h2>Your team<br />has the final word.</h2><dl><div><dt>Proposed by</dt><dd>{emailFor(change.created_by).split("@")[0]}</dd></div><div><dt>Based on</dt><dd>Version {change.base_version}</dd></div><div><dt>Current initiative</dt><dd>Version {project.version}</dd></div></dl>{change.status === "pending" ? <>{project.version !== change.base_version && <div className={s.warning}>The initiative has changed. Prepare a fresh review before applying edits.</div>}{change.created_by === user.id && <p className={s.muted}>Another owner or reviewer must decide on your proposal.</p>}<label>Decision note<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Explain your decision or the revisions needed…" maxLength={4000} /></label><button className={s.primary} onClick={() => decide("applied")} disabled={!!busy || !canReview || change.created_by === user.id || project.version !== change.base_version || !change.proposal.patches.length || change.proposal.questions.length > 0}><Icon name="check" size={16} />Approve & apply edits</button><button className={s.secondary} onClick={() => decide("rejected")} disabled={!!busy || !canReview || change.created_by === user.id || !note.trim()}>Request revisions</button><small>Records your identity and decision. Applies only the text shown here; prototype behaviour and external tools need separate review.</small></> : <div className={s.success}><strong>{change.status === "applied" ? "Approved and applied" : "Revisions requested"}</strong><p>{emailFor(change.decided_by)} · {date(change.decided_at)}</p>{change.decision_note && <p>{change.decision_note}</p>}</div>}</section>{change.proposal.questions.length > 0 && <section className={s.findings}><h3>Decisions needed</h3>{change.proposal.questions.map((q, i) => <p key={i}><span>?</span>{q}</p>)}</section>}{change.proposal.risks.length > 0 && <section className={s.findings}><h3>Keep in view</h3>{change.proposal.risks.map((risk, i) => <p key={i}><span>!</span>{risk}</p>)}</section>}</aside></div></>}
      {workspace && view === "team" && <><div className={s.pageHeading}><div><span className={s.eyebrow}>THE PEOPLE BEHIND THE PRODUCT</span><h1>Different perspectives.<br />One shared direction.</h1><p>Editors shape the work. Reviewers make decisions. Everyone sees the context.</p></div>{role === "owner" && <button className={s.primary} onClick={() => openModal("invite")}>Invite teammate <Icon name="plus" size={17} /></button>}</div><section className={s.members}><div className={s.sectionHeading}><h2>Workspace members</h2><span>{data.members.length} people</span></div>{data.members.map((m, i) => <div className={s.member} key={m.user_id}><Avatar email={m.email} index={i} /><div><strong>{m.email.split("@")[0]}{m.user_id === user.id ? " (you)" : ""}</strong><span>{m.email}</span></div><Pill>{m.role}</Pill>{role === "owner" && m.role !== "owner" && <button className={s.textButton} onClick={() => perform("Removing member", () => mutate("remove_member", { userId: m.user_id }))}>Remove access</button>}</div>)}</section><div className={s.roleGrid}>{[["Owner", "Manage access, edit initiatives and review a teammate’s proposal."], ["Editor", "Edit initiatives, prepare AI changes and join discussions."], ["Reviewer", "Read initiatives, discuss changes and approve a teammate’s proposal."], ["Viewer", "Read the shared initiative and its review history."]].map(([title, detail]) => <section key={title}><Icon name="shield" size={18} /><h3>{title}</h3><p>{detail}</p></section>)}</div>{role === "owner" && data.invites.filter(i => !i.accepted_at && !i.revoked_at).length > 0 && <section className={s.members}><h2>Pending invitations</h2>{data.invites.filter(i => !i.accepted_at && !i.revoked_at).map(i => <div className={s.member} key={i.id}><div><strong>{i.email}</strong><span>{i.role} · Expires {date(i.expires_at)}</span></div><button className={s.textButton} onClick={() => perform("Revoking invitation", () => mutate("revoke_invite", { inviteId: i.id }))}>Revoke</button></div>)}</section>}</>}
      {workspace && view === "document" && project && selectedNode?.artifact && <section className={s.reader}>
        <header className={s.readerToolbar}><button className={s.secondary} onClick={() => openTeamContext(project)}>← Discussion & changes</button><span>Read-only · Saved version {project.version}</span><label>Document<select aria-label="Read document" value={selectedNode.id} onChange={e => openProject(project, e.target.value)}>{project.document.nodes.filter(n => n.artifact).map(n => <option key={n.id} value={n.id}>{TYPE[n.type]?.label}</option>)}</select></label></header>
        <article className={s.readerPaper}><span className={s.eyebrow}>{project.document.name}</span><h1>{selectedNode.artifact.title}</h1><div className={s.documentBody}><p>{selectedNode.artifact.summary}</p>{selectedNode.artifact.prototype && <><p>Interactive simulation. External services use fictional data.</p><iframe title="Shared prototype preview" sandbox="allow-scripts" srcDoc={prototypeHtml(selectedNode.artifact.prototype)} /></>}<Markdown>{selectedNode.artifact.content || ""}</Markdown>{selectedNode.artifact.items?.map(item => <section key={item.id}><span className={s.eyebrow}>{item.id}</span><h2>{item.title}</h2><p>{item.detail}</p>{item.acceptanceCriteria?.length > 0 && <ul>{item.acceptanceCriteria.map((ac,i) => <li key={i}>{ac}</li>)}</ul>}</section>)}</div>{role !== "viewer" && <button className={s.secondary} onClick={() => { openTeamContext(project); setAnchor(selectedNode.id); }}>Discuss this document →</button>}</article>
      </section>}
      </div><footer className={s.footer}><span>Thoughtfully connected.</span><span>StockedBy · Team pilot</span></footer>
    </main>
    {modal && modal !== "delete" && <dialog className={s.dialog} ref={dialog} onCancel={() => setModal(null)} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}><button className={s.close} aria-label="Close dialog" onClick={() => setModal(null)}>×</button><span className={s.eyebrow}>{modal === "invite" ? "BRING ANOTHER PERSPECTIVE" : "MAKE SOMETHING WORTH SHARING"}</span><h2>{modal === "invite" ? "Better with your team." : modal === "workspace" ? "Name your shared space." : "Every good product starts somewhere."}</h2>{error && <div className={s.error} role="alert">{error}</div>}{modal === "invite" ? inviteLink ? <div><p>This private invitation is tied to <strong>{email}</strong> and expires in seven days. Share it with that teammate.</p><label>Invitation link<input readOnly value={inviteLink} onFocus={e => e.target.select()} /></label><button className={s.primary} onClick={() => perform("Copying invitation", async () => { await navigator.clipboard.writeText(inviteLink); setNotice("Invitation copied. Send it to the teammate you invited."); setModal(null); })}>Copy invitation link</button></div> : <form onSubmit={e => { e.preventDefault(); perform("Creating invitation", async () => { const result = await mutate("invite", { email, role: inviteRole }); setInviteLink(`${window.location.origin}/workspace?invite=${encodeURIComponent(result.token)}`); }); }}><label>Teammate’s work email<input type="email" value={email} required onChange={e => setEmail(e.target.value)} placeholder="colleague@company.com" /></label><label>Access<select value={inviteRole} onChange={e => setInviteRole(e.target.value)}><option value="editor">Editor — create and edit work</option><option value="reviewer">Reviewer — discuss and approve changes</option><option value="viewer">Viewer — read only</option></select></label><p className={s.muted}>Only the invited email can accept. No email is sent automatically.</p><button className={s.primary} disabled={!!busy}>Create invitation <Icon name="arrow" size={16} /></button></form> : <form onSubmit={e => { e.preventDefault(); perform("Creating your space", async () => { if (modal === "workspace") { const result = await api("", { action: "create_workspace", name }); setWorkspaceId(result.result.id); await load(result.result.id); setModal(null); } else await createProject(newProject(name)); }); }}><label>{modal === "workspace" ? "Workspace name" : "Project name"}<input autoFocus value={name} maxLength={modal === "workspace" ? 100 : 160} required onChange={e => setName(e.target.value)} placeholder={modal === "workspace" ? "Your product team" : "A better customer onboarding"} /></label><button className={s.primary} disabled={!!busy || !name.trim()}>Create {modal === "workspace" ? "workspace" : "project"}<Icon name="arrow" size={16} /></button>{modal === "project" && <div className={s.importOptions}><button type="button" className={s.secondary} onClick={() => file.current?.click()}><Icon name="upload" size={16} />Import project backup</button><button type="button" className={s.textButton} onClick={() => perform("Adding sample initiative", () => createProject(demoProject()))}>Start with the fictional sample ↗</button></div>}</form>}</dialog>}
    {modal === "delete" && deleting && <dialog className={s.dialog} ref={dialog} aria-labelledby="delete-project-title" onCancel={e => { if (busy) e.preventDefault(); else setModal(null); }}>
      <span className={s.eyebrow}>DELETE PROJECT</span><h2 id="delete-project-title">Delete “{deleting.document.name}”?</h2>
      <p>This permanently removes the project, its documents, prototypes, discussions and proposed changes for everyone in this workspace.</p>
      <p className={s.deleteSummary}>{deleting.document.nodes.filter(n => n.artifact).length} documents · Updated {date(deleting.updated_at || deleting.created_at)} · Version {deleting.version}</p>
      <p>This can’t be undone. You can save a project backup first.</p>
      {error && <div className={s.error} role="alert">{error}</div>}
      <button className={s.textButton} disabled={!!busy} onClick={() => { const link = document.createElement("a"), url = URL.createObjectURL(new Blob([JSON.stringify({ format: "stockedby-studio", version: 1, project: deleting.document }, null, 2)], { type: "application/json" })); link.href=url; link.download=deleting.document.name+"-backup.json"; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); }}>Download project backup</button>
      <div className={s.deleteActions}><button autoFocus className={s.secondary} disabled={!!busy} onClick={() => setModal(null)}>Keep project</button><button className={s.danger} disabled={!!busy} onClick={() => perform("Deleting project", async () => {
        if (!demo) await api("", { action: "delete_project", workspaceId, projectId: deleting.id, version: deleting.version });
        setData(d => ({ ...d, projects: d.projects.filter(p => p.id !== deleting.id), changes: d.changes.filter(c => c.project_id !== deleting.id), comments: d.comments.filter(c => c.project_id !== deleting.id), events: d.events.filter(e => e.project_id !== deleting.id) }));
        if (projectId === deleting.id) { setProjectId(null); setChangeId(null); window.history.replaceState(null,"",window.location.pathname+window.location.search); }
        setModal(null); setNotice(`“${deleting.document.name}” deleted.`); setDeleting(null);
      })}>{busy ? "Deleting…" : "Delete project"}</button></div>
    </dialog>}
    <input type="file" accept="application/json,.json" hidden ref={file} onChange={e => { const upload = e.target.files?.[0]; e.target.value = ""; if (upload) perform("Importing initiative", async () => { if (upload.size > 850000) throw Error("Choose a project backup below 850 KB."); await createProject(parseProjectFile(await upload.text())); }); }} />
  </div>;
}

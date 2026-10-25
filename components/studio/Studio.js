"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import Icon from "./Icon";
import s from "./studio.module.css";
import {
  NODE_TYPES,
  TYPE,
  STORAGE_KEY,
  newProject,
  uid,
  record,
  invalidate,
  updateContext,
  updateArtifact,
  reorder,
  groundedRule,
  traceRows,
  approvalProblems,
  parseProjectFile,
  resolveDocumentQuery,
} from "@/lib/studio/model";
import ProductPlan from "./ProductPlan";
import QueryReview from "./QueryReview";
import { documentQueries, queryResolutionInput } from "@/lib/studio/queries";
import { makePlanProposal, contextFingerprint, planContext, fingerprint } from "@/lib/studio/product-plan";
import PrototypeWorkbench from "./PrototypeWorkbench";
import PrototypeSetup from "./PrototypeSetup";
import ProjectInputs, { INPUT_ACCEPT } from "./ProjectInputs";
import ReviewDesk from "./ReviewDesk";
import Connections from "./Connections";
import { WORKFLOW_PRESETS, checkpoint } from "@/lib/studio/review";
import w from "./workbench.module.css";
import { demoProject } from "@/lib/studio/demo";
import { exportProject } from "@/lib/studio/downloads";
import { initialDocument, documentView, generationUpstream } from "@/lib/studio/navigation";
const tabs = [
  ["inputs", "1. Inputs", "folder"],
  ["documents", "2. Your documents", "brief"],
  ["prototype", "Prototype", "screen"],
  ["plan", "Product plan", "brief"],
  ["canvas", "Workflow", "flow"],
  ["review", "Review history", "check"],
  ["connections", "Connections", "link"],
  ["standards", "Standards", "shield"],
  ["trace", "Traceability", "link"],
];
const advancedTabs = ["plan", "canvas", "review", "connections", "standards", "trace"];
const statusLabel = (a) =>
  a
    ? { draft: "Draft", approved: "Reviewed", stale: "Needs update" }[
        a.status
      ] || "Draft"
    : "Not started";
function Brand() {
  return (
    <Link href="/" className={s.brand}>
      <span className={s.mark}>
        s<span>↗</span>
      </span>
      stockedby<span className={s.beta}>STUDIO</span>
    </Link>
  );
}
export default function Studio({ shared = null }) {
  const [projects, setProjects] = useState([]),
    [active, setActive] = useState(""),
    [loaded, setLoaded] = useState(false),
    [saved, setSaved] = useState("Loading…"),
    [tab, setTab] = useState("inputs"),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState(null),
    [prototypeRequest, setPrototypeRequest] = useState(null),
    [sourceKind, setSourceKind] = useState("context"),
    [sourceName, setSourceName] = useState(""),
    [sourceText, setSourceText] = useState(""),
    [sourceEdit, setSourceEdit] = useState(null),
    [sourceImage, setSourceImage] = useState(false),
    [reviewer, setReviewer] = useState(""),
    [editing, setEditing] = useState(false),
    [configured, setConfigured] = useState(null),
    [exporting, setExporting] = useState(false),
    [dragOver, setDragOver] = useState(null);
  const state = useRef({ projects: [], active: "" }),
    abort = useRef(null),
    stop = useRef(false),
    saveTimer = useRef(null),
    fileInput = useRef(null),
    backupInput = useRef(null),
    dialogRef = useRef(null),
    startLock = useRef(false);
  const p = projects.find((p) => p.id === active),
    node = p?.nodes.find((n) => n.id === selected),
    artifact = node?.artifact;
  function resumeProject(project) {
    const output = project.nodes.find(n => n.id === shared?.initialNodeId) || initialDocument(project);
    setSelected(output?.id || null);
    setTab(shared?.initialView || (output ? documentView(output) : "inputs"));
    setEditing(false);
  }
  function openDocuments() {
    const project = current();
    const output = project.nodes.find(n => n.id === selected && n.artifact && n.type !== "prototype")
      || project.nodes.find(n => n.type === "requirements" && n.artifact)
      || project.nodes.find(n => n.artifact && n.type !== "prototype")
      || project.nodes.find(n => n.type === "requirements");
    setSelected(output?.id || null);
    setEditing(false);
    setTab("documents");
  }
  function apply(nextProjects, nextActive = state.current.active) {
    if (shared && nextActive !== shared.project.id) {
      setError("Create or import initiatives from your team workspace.");
      return;
    }
    if (shared) {
      const next = nextProjects.find(p => p.id === nextActive);
      if (next) shared.onChange(next);
    }
    state.current = { projects: nextProjects, active: nextActive };
    setProjects(nextProjects);
    setActive(nextActive);
    setSaved(shared ? "Team draft · autosaves online" : "Saving…");
  }
  function change(fn) {
    const snapshot = state.current;
    apply(snapshot.projects.map((p) => (p.id === snapshot.active ? fn(p) : p)));
  }
  function changeProject(projectId, fn) {
    const snapshot = state.current;
    apply(
      snapshot.projects.map((project) =>
        project.id === projectId ? fn(project) : project,
      ),
    );
  }
  function current() {
    return state.current.projects.find((p) => p.id === state.current.active);
  }
  useEffect(() => {
    if (shared && loaded) shared.onNavigate?.({ tab, nodeId: selected });
  }, [tab, selected, loaded, shared]);
  const notifyBusy = shared?.onBusyChange;
  useEffect(() => {
    notifyBusy?.(busy);
  }, [busy, notifyBusy]);
  function showQuestions() {
    const section = document.getElementById("document-questions");
    section?.scrollIntoView({ block: "start", behavior: "instant" });
    section?.focus({ preventScroll: true });
  }
  useEffect(() => {
    try {
      if (shared) {
        const data = { projects: [structuredClone(shared.project)], active: shared.project.id };
        state.current = data;
        // Hydrate the isolated editor from its mount-time shared snapshot.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProjects(data.projects); setActive(data.active); setLoaded(true); setSaved("Team draft · autosaves online");
        resumeProject(data.projects[0]);
        fetch("/api/studio/generate").then(r => r.json()).then(d => setConfigured(d.configured)).catch(() => setConfigured(false));
        return () => abort.current?.abort();
      }
      const query = new URLSearchParams(window.location.search);
      const raw = localStorage.getItem(STORAGE_KEY);
      let data = raw ? JSON.parse(raw) : null;
      if (
        data &&
        (!Array.isArray(data.projects) ||
          !data.projects.length ||
          data.projects.some(
            (p) =>
              !p.id ||
              !Array.isArray(p.nodes) ||
              !Array.isArray(p.sources) ||
              !Array.isArray(p.rules) ||
              !Array.isArray(p.activity),
          ))
      )
        throw new Error("Invalid local storage");
      if (!data) {
        const project = newProject();
        data = { projects: [project], active: project.id };
      }
      data.active = data.projects.some((p) => p.id === data.active)
        ? data.active
        : data.projects[0].id;
      if (new URLSearchParams(window.location.search).get("demo") === "1") {
        const existing = data.projects.find(
          (p) => p.demo && p.productPlan && p.nodes.some((n) => n.artifact?.prototype),
        );
        const project = existing || demoProject();
        data = {
          projects: existing ? data.projects : [...data.projects, project],
          active: project.id,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        window.history.replaceState(null, "", "/studio");
      }
      resumeProject(data.projects.find(project => project.id === data.active));
      if (query.has("connected") || query.has("connectorError")) {
        // Hydrate the initial workspace view from the browser URL.
        setTab("connections");
        if (query.has("connectorError")) setError(query.get("connectorError"));
        window.history.replaceState(null, "", "/studio");
      }
      if (query.get("view") === "prototype") setTab("prototype");
      state.current = data;
      // This one-time hydration synchronizes state from browser-only storage.
      setProjects(data.projects);
      setActive(
        data.projects.some((p) => p.id === data.active)
          ? data.active
          : data.projects[0].id,
      );
      setLoaded(true);
      setSaved("Saved on this browser");
    } catch {
      setError(
        "Could not read your local workspace. Download the stored data before resetting it.",
      );
      setSaved("Storage unavailable");
    }
    fetch("/api/studio/generate")
      .then((r) => r.json())
      .then((d) => setConfigured(d.configured))
      .catch(() => setConfigured(false));
    return () => {
      abort.current?.abort();
    };
  // The editor is mounted with a fixed initiative snapshot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!loaded || shared) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, active }));
        setSaved("Saved on this browser");
      } catch {
        setSaved("Not saved — export a backup");
        setError(
          "Browser storage is full or unavailable. Export a project backup now.",
        );
      }
    }, 450);
    const flush = () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.current));
      } catch {}
    };
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(saveTimer.current);
      window.removeEventListener("pagehide", flush);
    };
  }, [projects, active, loaded, shared]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    const dialog = dialogRef.current;
    if (!dialog?.contains(document.activeElement)) dialog?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);
  function add(type, beforeId) {
    if (busy || !TYPE[type]) return;
    const existing = p.nodes.find(n => n.type === type);
    if (existing) {
      setSelected(existing.id);
      setTab("canvas");
      return;
    }
    if (p.nodes.length >= 12) {
      setError("Use up to 12 steps in one workflow.");
      return;
    }
    const n = { id: uid(), type, instruction: "", artifact: null };
    change((p) => {
      const nodes = [...p.nodes],
        i = nodes.findIndex((n) => n.id === beforeId);
      nodes.splice(i < 0 ? nodes.length : i, 0, n);
      return record(
        invalidate({ ...p, nodes }, i < 0 ? nodes.length - 1 : i),
        `${TYPE[type].label} added to the workflow.`,
      );
    });
    setSelected(n.id);
    setTab("canvas");
  }
  function drop(e, beforeId) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(null);
    if (busy) return;
    try {
      const d = JSON.parse(
        e.dataTransfer.getData("application/stockedby-node"),
      );
      if (d.type) add(d.type, beforeId);
      else if (d.id) change((p) => reorder(p, d.id, beforeId));
    } catch {}
  }
  function startSource(kind, source = null) {
    setSourceKind(kind);
    setSourceName(source?.name || "");
    setSourceText(source?.text || "");
    setSourceEdit(source?.id || null);
    setSourceImage(source?.text?.startsWith("[AI-read image") || false);
    setModal("source");
    setError("");
  }
  function saveSource() {
    if (!sourceName.trim() || sourceText.trim().length < 20) {
      setError("Give the source a name and at least 20 characters of text.");
      return;
    }
    if (sourceText.length > 40000) {
      setError("Shorten this source to 40,000 characters.");
      return;
    }
    if (!sourceEdit && p.sources.length >= 20) {
      setError("Use up to 20 sources per project.");
      return;
    }
    change((p) => {
      const source = {
        id: sourceEdit || `SRC-${uid().slice(0, 8)}`,
        kind: sourceKind,
        name: sourceName.trim(),
        text: sourceText.trim(),
      };
      return updateContext(p, {
        sources: sourceEdit
          ? p.sources.map((s) => (s.id === sourceEdit ? source : s))
          : [...p.sources, source],
        rules: p.rules.filter((r) => r.sourceId !== sourceEdit),
      });
    });
    setModal(null);
    setError("");
    if (sourceKind === "context") setTab("inputs");
    setToast(sourceKind === "context" ? "Input added. Select Create PRD when your inputs are ready." : "Standard added. Review and confirm the rules that apply.");
  }
  function uploadProjectFiles(files) {
    if (!files?.length || busy) return;
    startSource("context");
    if (files.length > 1) { setError("Add one file at a time so you can review each input."); return; }
    upload(files[0]);
  }
  async function upload(file) {
    if (!file) return;
    if (file.size > 3000000) {
      setError("Choose a file under 3 MB.");
      return;
    }
    setBusy("upload");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/studio/extract", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSourceName(data.name);
      setSourceText(data.text);
      setSourceImage(!!data.image);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function generate(project, n, type = n?.type, sourceNodeId = null) {
    const upstream = generationUpstream(project, n?.id, sourceNodeId);
    abort.current = new AbortController();
    const res = await fetch("/api/studio/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: abort.current.signal,
      body: JSON.stringify({
        type,
        name: project.name,
        brief: project.brief,
        sources: project.sources,
        rules: project.rules,
        productPlan: project.productPlan,
        upstream: type === "plan" ? project.nodes.filter(x => x.artifact && x.artifact.status !== "stale").map(x => ({type:x.type,...x.artifact})) : upstream,
        instruction: n?.instruction || "",
        prototypeSettings: n?.prototypeSettings,
        decisions: project.decisions || [],
        queryResolutions: queryResolutionInput(project),
        previous: n?.artifact || null,
      }),
    });
    const data = await res.json().catch(() => ({ error: "The generation service did not return a response. Retry this step; your existing content is unchanged." }));
    if (!res.ok || !data.artifact) throw new Error((data.error || "AI request failed.") + (data.reference ? ` Reference: ${data.reference}` : ""));
    return data.artifact;
  }
  async function draftPlan() {
    if (startLock.current) return;
    startLock.current = true; stop.current = false;
    setBusy("plan"); setError("");
    const snapshot = current();
    try {
      const plan = await generate(snapshot, null, "plan");
      if (stop.current) return;
      if (current()?.id !== snapshot.id || contextFingerprint(current()) !== contextFingerprint(snapshot) || fingerprint(planContext(current())) !== fingerprint(planContext(snapshot))) throw Error("Your project changed during drafting. Your edits are safe; request a fresh proposal.");
      change(p => record({...p,planProposal:makePlanProposal(p,plan)},"AI product plan proposed for review. No existing decisions replaced."));
      setToast("AI proposal ready. Review and apply one section at a time.");
    } catch(e) { if(e.name !== "AbortError") setError(e.message); }
    finally {setBusy(null);startLock.current=false;}
  }
  function openBuilder(type) {
    const project=current(),existing=project.nodes.find(n=>n.type===type);
    if(existing) {setSelected(existing.id);setTab("documents");}
    else {add(type);setTab("documents");}
  }
  function createPrd() {
    if (busy || startLock.current) return;
    const project = current();
    let target = project.nodes.find(n => n.type === "requirements");
    if (target?.artifact) { setSelected(target.id); setTab("documents"); return; }
    if (!target) {
      target = { id: uid(), type: "requirements", instruction: "", artifact: null };
      change(p => record({ ...p, nodes: [...p.nodes, target] }, "PRD added."));
    }
    run([target.id]);
  }
  function continueWithPrd(type) {
    if (busy || startLock.current) return;
    const sourceId = selected;
    let target = current().nodes.find(n => n.type === type);
    setModal(null);
    setEditing(false);
    if (target?.artifact) {
      setSelected(target.id); setTab(documentView(target));
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }
    if (!target) {
      target = { id: uid(), type, instruction: "", artifact: null };
      change(p => record({ ...p, nodes: [...p.nodes, target] }, `${TYPE[type].label} added after the PRD.`));
    }
    change(p => record({ ...p, nodes: p.nodes.map(n => n.id === target.id ? { ...n, sourceNodeId: sourceId } : n) }, "Continuing from the PRD. Open queries remain open."));
    run([target.id], sourceId);
  }
  function resolveQuery(query, status, answer = "") {
    try {
      change(p => resolveDocumentQuery(p, selected, query, status, answer));
      setToast(status === "answered" ? "Answer saved. Update the PRD to apply it, or continue with this draft." : status === "ignored" ? "Query ignored. You can reopen it anytime." : "Query reopened.");
    } catch (e) { setError(e.message); }
  }
  async function run(ids, sourceNodeId = null, prototypeConfirmed = false) {
    if (startLock.current) return;
    const prototype = current().nodes.find(n => ids.includes(n.id) && n.type === "prototype");
    if (prototype && !prototypeConfirmed) {
      setPrototypeRequest({ ids, sourceNodeId, nodeId: prototype.id });
      setModal("prototype-setup");
      return;
    }
    startLock.current = true;
    stop.current = false;
    setError("");
    setEditing(false);
    try {
      for (const id of ids) {
        if (stop.current) break;
        const project = current(),
          n = project.nodes.find((n) => n.id === id);
        if (!n) continue;
        setBusy(id);
        setSelected(id);
        setTab(documentView(n));
        window.scrollTo({ top: 0, behavior: "instant" });
        const artifact = await generate(project, n, n.type, sourceNodeId);
        if (stop.current) break;
        if (
          current()?.id !== project.id ||
          current()?.updatedAt !== project.updatedAt
        )
          throw new Error(
            "Project context changed while AI was running. Your previous version is intact. Run this step again with the updated context.",
          );
        change((p) => updateArtifact(p, id, artifact));
        setSelected(id);
        setTab(documentView(n));
        window.scrollTo({ top: 0, behavior: "instant" });
      }
      if (!stop.current) setToast(current()?.nodes.find(n => n.id === ids.at(-1))?.type === "prototype" ? "Your prototype is ready. Try the screens and review scenarios below." : "Your document is ready. Read it below, edit it or download Word.");
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      setBusy(null);
      startLock.current = false;
    }
  }
  async function extractRules() {
    if (startLock.current) return;
    startLock.current = true;
    setBusy("standards");
    setError("");
    try {
      const output = await generate(current(), null, "standards");
      change((p) =>
        record(
          invalidate({ ...p, rules: output.rules }),
          "Standards extracted. Confirm the rules that apply.",
        ),
      );
      setToast(`${output.rules.length} source-backed rules ready to review.`);
      if (output.findings.length)
        setError(output.findings.map((f) => f.issue).join(" "));
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message);
    } finally {
      setBusy(null);
      startLock.current = false;
    }
  }
  function cancel() {
    stop.current = true;
    abort.current?.abort();
    setToast("Stopped. Completed drafts remain in your project. Check the save status before closing.");
  }
  async function exportAs(format, nodeId) {
    setExporting(true);
    setError("");
    try {
      await exportProject(p, format, nodeId);
      setToast("Your export is ready.");
      setModal(null);
    } catch {
      setError("Could not create the export. Try a JSON backup.");
    } finally {
      setExporting(false);
    }
  }
  async function importBackup(file) {
    if (!file) return;
    try {
      if (file.size > 2500000) throw new Error("Backup exceeds 2.5 MB.");
      const project = parseProjectFile(await file.text());
      apply([...projects, project], project.id);
      resumeProject(project);
      setToast(
        "Project imported. Review records and standards need reconfirmation.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      if (backupInput.current) backupInput.current.value = "";
    }
  }
  function create(demo = false) {
    if (shared) { setError("Create initiatives from your team workspace."); return; }
    const project = demo ? demoProject() : newProject();
    apply([...projects, project], project.id);
    resumeProject(project);
    setModal(null);
    setError("");
  }
  function approve() {
    if (!reviewer.trim()) return;
    change((p) =>
      record(
        {
          ...p,
          nodes: p.nodes.map((n) =>
            n.id === selected
              ? {
                  ...n,
                  artifact: {
                    ...n.artifact,
                    status: "approved",
                    approval: {
                      by: reviewer.trim(),
                      at: new Date().toISOString(),
                    },
                  },
                }
              : n,
          ),
        },
        `${TYPE[node.type].label} reviewed locally by ${reviewer.trim()}.`,
      ),
    );
    setModal(null);
  }
  function updateDoc(patch) {
    change((p) =>
      updateArtifact(
        p,
        selected,
        {
          ...p.nodes.find((n) => n.id === selected).artifact,
          ...patch,
        },
        { manual: true },
      ),
    );
  }
  function editItem(id, patch) {
    updateDoc({
      items: artifact.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    });
  }
  const generated = p?.nodes.filter((n) => n.artifact).length || 0;
  const prd = p?.nodes.find(n => n.type === "requirements");
  const hasInputs = !!p && (p.brief.trim().length >= 20 || p.sources.some(source => source.kind === "context" && source.text.trim().length >= 20) || Object.values(planContext(p)).flatMap(section => Object.values(section.fields)).join(" ").trim().length >= 20);
  const nextDraft = p?.nodes.find(n => !n.artifact || n.artifact.status === "stale");
  if (!p)
    return (
      <div className={s.app}>
        <div className={s.loading}>
          <Brand />
          <p>{error || "Opening your workspace…"}</p>
          {error && (
            <button
              className={s.primary}
              onClick={() => {
                const raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(
                    new Blob([raw], { type: "application/json" }),
                  );
                  a.download = "stockedby-recovery.json";
                  a.click();
                }
                const project = newProject();
                apply([project], project.id);
                setLoaded(true);
                setError("");
              }}
            >
              Download recovery data & start fresh
            </button>
          )}
        </div>
      </div>
    );
  return (
    <div className={s.app}>
      {!shared && <header className={s.header}>
        <Brand />
        <span className={s.breadcrumb}>
          Workspace <Icon name="chevron" size={13} />
          <span>{p.name}</span>
        </span>
        <div className={s.headerRight}>
          <span className={s.local}>
            <i />
            {saved}
          </span>
          <button
            className={s.headerButton}
            onClick={() => setModal("export")}
            disabled={!!busy}
          >
            <Icon name="export" size={16} /> Export
          </button>
          {!shared && <Link className={s.headerButton} href="/workspace">Team workspace ↗</Link>}
          <span className={s.avatar}>ME</span>
        </div>
      </header>}
      <div className={s.workspace}>
        <aside className={s.sidebar}>
          <div className={s.workspaceTitle}>
            <span className={s.workspaceIcon}>
              <Icon name="layers" />
            </span>
            <div>
                {shared ? shared.name : "My workspace"}<small>{shared ? "Shared project" : "Personal draft · this browser"}</small>
            </div>
          </div>
          {!shared && <><div className={s.sideLabel}>
            PROJECTS{" "}
            <button
              title="New project"
              aria-label="New project"
              disabled={!!busy || !!shared}
              onClick={() => create()}
            >
              <Icon name="plus" size={15} />
            </button>
          </div>
          <select
            aria-label="Current project"
            className={s.projectSelect}
            value={active}
            disabled={!!busy}
            onChange={(e) => {
              apply(projects, e.target.value);
              resumeProject(projects.find(project => project.id === e.target.value));
              setError("");
            }}
          >
            {projects.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
          </select></>}
          <div className={s.sideDivider} />
          {tab === "canvas" ? (
            <>
              <div className={s.sideLabel}>
                BUILD YOUR WORKFLOW <span>↓</span>
              </div>
              <p className={s.sideHint}>
                Drag a step onto the canvas.
                <br />
                Or click to add. A check means it’s already included.
              </p>
              <div className={s.nodeLibrary}>
                {NODE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    disabled={!!busy}
                    draggable={!busy && !p.nodes.some(n => n.type === t.id)}
                    onDragStart={(e) =>
                      e.dataTransfer.setData(
                        "application/stockedby-node",
                        JSON.stringify({ type: t.id }),
                      )
                    }
                    onClick={() => add(t.id)}
                    title={p.nodes.some(n => n.type === t.id) ? `Open ${t.label} in your workflow` : t.description}
                  >
                    <span className={`${s.iconTile} ${s[t.color]}`}>
                      <Icon name={t.icon} size={17} />
                    </span>
                    <span>{t.label}</span>
                    <Icon name={p.nodes.some(n => n.type === t.id) ? "check" : "plus"} size={13} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className={s.deliveryNav}>
              <div className={s.sideLabel}>YOUR DOCUMENTS</div>
              {p.nodes.filter(n => n.artifact || n.type === "requirements").map((n) => (
                <button
                  key={n.id}
                  aria-current={selected === n.id && ["documents", "prototype"].includes(tab) ? "page" : undefined}
                  onClick={() => {
                    setSelected(n.id);
                    setTab(n.type === "prototype" ? "prototype" : "documents");
                    setEditing(false);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                >
                  <span
                    className={`${s.deliveryDot} ${n.artifact?.status === "stale" ? s.needsUpdate : ""}`}
                  />
                  <span>{n.type === "review" ? "Readiness" : TYPE[n.type].short}</span>
                  <small>{statusLabel(n.artifact)}</small>
                </button>
              ))}
            </div>
          )}
          <div className={s.sideDivider} />
          <button
            className={s.sideAction}
            disabled={!!busy}
            onClick={() => setTab("inputs")}
          >
            <Icon name="folder" /> Project inputs{" "}
            <span>{p.sources.filter((s) => s.kind === "context").length}</span>
          </button>
          <button
            className={s.sideAction}
            disabled={!!busy}
            onClick={() => setTab("standards")}
          >
            <Icon name="shield" /> Company standards{" "}
            <span>{p.rules.filter((r) => r.approved).length}</span>
          </button>
          <div className={s.sideBottom}>
            <button
              className={s.mobileNew}
              aria-label="New project"
              title="New project"
              disabled={!!busy || !!shared}
              onClick={() => create()}
            >
              <Icon name="plus" size={18} />
            </button>
            <div className={s.storageNote}>
              <Icon name="shield" size={16} />
              <p>
                {shared?.demo ? "Fictional team demo." : shared ? "Saved with your team." : "Your browser. Your workspace."}
                <small>
                  {shared?.demo ? "Demo changes stay in this tab and reset on reload." : shared ? "Changes autosave online. Check the save status above before closing. AI runs send context to OpenAI." : "Export a backup to move or protect your work. AI runs send context to OpenAI."}
                </small>
              </p>
            </div>
            {!shared && <><button onClick={() => create(true)} disabled={!!busy}>
              <Icon name="play" size={14} /> Explore sample project
            </button>
            <button
              onClick={() => backupInput.current?.click()}
              disabled={!!busy || !!shared}
            >
              <Icon name="upload" size={14} /> Open project backup
            </button></>}
            <Link href="/guide" target={shared ? "_blank" : undefined} rel={shared ? "noopener noreferrer" : undefined}>
              Workspace guide <Icon name="arrow" size={14} />
            </Link>
          </div>
        </aside>
        <main className={s.main}>
          <div className={s.projectHeader}>
            <div>
              <span className={s.eyebrow}>
                PRODUCT DELIVERY WORKSPACE {p.demo && <b>FICTIONAL SAMPLE</b>}
              </span>
              <input
                aria-label="Project name"
                value={p.name}
                maxLength={160}
                disabled={!!busy}
                onChange={(e) =>
                  change((p) => ({
                    ...p,
                    name: e.target.value,
                    updatedAt: new Date().toISOString(),
                  }))
                }
              />
              <p>Add your inputs. Create a PRD. Read, edit and share it.</p>
            </div>
            {shared && <button className={s.secondary} onClick={() => setModal("export")} disabled={!!busy}><Icon name="export" size={16} /> Export</button>}
            {tab === "canvas" && <button
              className={s.run}
              disabled={busy === "upload" || (!busy && tab !== "inputs" && (p.nodes.length === 0 || (nextDraft && configured === false)))}
              title={nextDraft ? `Next: ${TYPE[nextDraft.type].label}` : "Open your outputs for review"}
              onClick={() => (busy ? cancel() : tab === "inputs" ? setTab("canvas") : nextDraft ? run([nextDraft.id]) : setTab("documents"))}
            >
              <Icon name={busy ? "close" : "play"} size={16} />
              {busy ? "Stop generation" : tab === "inputs" ? "Choose outputs" : nextDraft ? "Generate next draft" : "Review outputs"}
              {!busy && <span>↗</span>}
            </button>}
          </div>
          <div className={s.tabBar}>
            <div role="tablist" aria-label="Workspace views">
              {tabs.filter(([key]) => !advancedTabs.includes(key)).map(([key, label, icon]) => (
                <button
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? s.activeTab : ""}
                  key={key}
                  onClick={() => key === "documents" ? openDocuments() : setTab(key)}
                >
                  <Icon name={icon} size={16} />
                  {label}
                  {key === "documents" && <span>{generated}</span>}
                </button>
              ))}
            </div>
            <details className={s.moreViews}><summary>{advancedTabs.includes(tab) ? tabs.find(t => t[0] === tab)[1] : "More"} ▾</summary><div>{tabs.filter(([key]) => advancedTabs.includes(key)).map(([key, label, icon]) => <button key={key} onClick={e => { setTab(key); e.currentTarget.closest("details").open = false; }}><Icon name={icon} size={16} />{label}</button>)}</div></details>
          </div>
          {configured === false && (
            <div className={s.notice}>
              AI is not configured on this deployment. You can still edit,
              explore the sample and export.
            </div>
          )}
          {error && (
            <div className={s.error} role="alert">
              {error}
              <button aria-label="Dismiss message" onClick={() => setError("")}>
                <Icon name="close" size={15} />
              </button>
            </div>
          )}
          {busy && (
            <div className={s.aiProgress} role="status">
              <span className={s.spinner} />
              <strong>
                {busy === "plan" ? "Drafting a product plan from your evidence" : busy === "standards"
                  ? "Reading company standards"
                  : busy === "upload"
                    ? "Reading your document"
                    : `Drafting ${TYPE[p.nodes.find((n) => n.id === busy)?.type]?.label || "your document"}`}
              </strong>
              <span>{busy === "upload" ? "Extracting content for you to check. This does not create a PRD." : "Your result will appear here when it is ready."}</span>
              {busy !== "upload" && <button onClick={cancel} className={s.textLink}>Stop drafting</button>}
            </div>
          )}
          <div className={`${s.body} ${tab === "canvas" ? s.canvasBody : ""}`}>
            {tab === "plan" && <ProductPlan key={p.id} project={p} change={change} busy={!!busy} configured={configured} draft={draftPlan} open={setTab} build={openBuilder}/>}
            {tab === "inputs" && <ProjectInputs project={p} busy={!!busy} shared={!!shared} demo={!!shared?.demo}
              upload={uploadProjectFiles} paste={() => startSource("context")} edit={source => startSource("context", source)}
              updateBrief={brief => change(p => updateContext(p, { brief }))} next={createPrd} hasPrd={!!prd?.artifact} canCreate={hasInputs && configured !== false} workflow={() => setTab("canvas")} standards={() => setTab("standards")} />}

            {tab === "prototype" && (
              <PrototypeWorkbench
                key={p.id}
                project={p}
                selectedNodeId={selected}
                onSelect={setSelected}
                change={(fn) => changeProject(p.id, fn)}
                run={run}
                add={() => {
                  add("prototype");
                  const target = current().nodes.find(n => n.type === "prototype");
                  if (target) { setTab("prototype"); run([target.id]); }
                }}
                hasInputs={hasInputs}
                onInputs={() => setTab("inputs")}
                busy={busy}
                configured={configured}
              />
            )}
            {tab === "review" && (
              <ReviewDesk
                key={p.id}
                project={p}
                change={(fn) => changeProject(p.id, fn)}
                busy={!!busy}
                openDocument={(id) => {
                  setSelected(id);
                  setTab("documents");
                }}
              />
            )}
            {tab === "connections" && (
              <Connections
                key={p.id}
                project={p}
                change={(fn) => changeProject(p.id, fn)}
                busy={!!busy}
              />
            )}
            {tab === "canvas" && (
              <>
                <section
                  className={s.canvas}
                  aria-label="Workflow canvas"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => drop(e, null)}
                >
                  {!shared && <div
                    className={w.templateRow}
                    aria-label="Start from a workflow template"
                  >
                    {WORKFLOW_PRESETS.map((template) => (
                      <button
                        key={template.id}
                        disabled={!!busy || !!shared}
                        title={shared ? "Create a new initiative from the team workspace." : template.description}
                        onClick={() => {
                          const next = newProject(template.name);
                          next.nodes = template.types.map((type) => ({
                            id: uid(),
                            type,
                            instruction: "",
                            artifact: null,
                          }));
                          apply([...state.current.projects, next], next.id);
                          setSelected(null);
                        }}
                      >
                        ＋ {template.name}
                      </button>
                    ))}
                  </div>}
                  <div className={s.canvasMeta}>
                    <span>
                      <i /> WORKFLOW BUILDER
                    </span>
                    <span>{p.nodes.length} steps · drag to reorder</span>
                  </div>
                  <div className={s.contextCard}>
                    <span className={`${s.iconTile} ${s.darkTile}`}>
                      <Icon name="folder" />
                    </span>
                    <div>
                      <strong>Project inputs <span className={s.inputCount}>{p.sources.filter(source => source.kind === "context").length} files / notes</span></strong>
                      <small>
                        {p.brief
                          ? p.brief.slice(0, 100) +
                            (p.brief.length > 100 ? "…" : "")
                          : "Use a BRD, discovery notes, documents or images."}
                      </small>
                    </div>
                    <button
                      aria-label="Open project inputs"
                      disabled={!!busy}
                      onClick={() => {
                        setSelected(null);
                        setTab("inputs");
                      }}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <span className={s.outputPort} />
                  </div>
                  <div className={s.workflowList}>
                    {p.nodes.map((n, i) => {
                      const type = TYPE[n.type];
                      return (
                        <div
                          className={s.nodeWrap}
                          key={n.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOver(n.id);
                          }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={(e) => drop(e, n.id)}
                        >
                          <div className={s.wire}>
                            <span />
                          </div>
                          <article
                            tabIndex={0}
                            role="button"
                            aria-label={`Select ${type.label} step ${i + 1}`}
                            onKeyDown={(e) => {
                              if (
                                e.target === e.currentTarget &&
                                (e.key === "Enter" || e.key === " ")
                              ) {
                                e.preventDefault();
                                setSelected(n.id);
                                if (n.artifact) setTab(documentView(n));
                              }
                            }}
                            className={`${s.node} ${selected === n.id ? s.selectedNode : ""} ${dragOver === n.id ? s.dropTarget : ""} ${busy === n.id ? s.runningNode : ""}`}
                            onClick={() => {
                              setSelected(n.id);
                              setEditing(false);
                              if (n.artifact) setTab(documentView(n));
                            }}
                            draggable={!busy}
                            onDragStart={(e) =>
                              e.dataTransfer.setData(
                                "application/stockedby-node",
                                JSON.stringify({ id: n.id }),
                              )
                            }
                          >
                            <span className={s.inputPort} />
                            <div className={s.nodeTop}>
                              <span
                                className={`${s.iconTile} ${s[type.color]}`}
                              >
                                <Icon name={type.icon} />
                              </span>
                              <div>
                                <span className={s.nodeIndex}>
                                  STEP {String(i + 1).padStart(2, "0")}
                                </span>
                                <h3>{type.label}</h3>
                              </div>
                              <Icon name="grip" size={15} />
                            </div>
                            <p>{n.artifact?.summary || type.description}</p>
                            <div className={s.nodeFoot}>
                              <span
                                className={`${s.status} ${n.artifact?.status === "approved" ? s.approved : n.artifact?.status === "stale" ? s.stale : ""}`}
                              >
                                <i />
                                {busy === n.id
                                  ? "AI is drafting…"
                                  : statusLabel(n.artifact)}
                              </span>
                              <span>
                                {n.artifact
                                  ? n.type === "prototype" ? "Open prototype" : "Read document"
                                  : "Configure step"}{" "}
                                <Icon name="chevron" size={12} />
                              </span>
                            </div>
                            <span className={s.outputPort} />
                          </article>
                        </div>
                      );
                    })}
                  </div>
                  <div className={s.wire} />
                  <button
                    className={`${s.addStep} ${dragOver === "end" ? s.dropTarget : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver("end");
                    }}
                    onClick={() => setModal("steps")}
                    disabled={!!busy}
                  >
                    <Icon name="plus" /> Add a step{" "}
                    <span>or drop one here</span>
                  </button>
                  <div className={s.canvasFooter}>
                    <span>CONNECTED BY CONTEXT</span>
                    <span>⌘ Your workflow, your way</span>
                  </div>
                </section>
                <aside className={s.inspector} aria-label="Step inspector">
                  {node ? (
                    <>
                      <div className={s.inspectorHeading}>
                        <span
                          className={`${s.iconTile} ${s[TYPE[node.type].color]}`}
                        >
                          <Icon name={TYPE[node.type].icon} />
                        </span>
                        <div>
                          <small>STEP SETTINGS</small>
                          <h2>{TYPE[node.type].label}</h2>
                        </div>
                      </div>
                      <p className={s.subtle}>{TYPE[node.type].description}</p>
                      <label className={s.field}>
                        What should this step focus on?
                        <textarea
                          value={node.instruction}
                          maxLength={2000}
                          disabled={!!busy}
                          onChange={(e) =>
                            change((p) => {
                              const idx = p.nodes.findIndex(
                                (n) => n.id === selected,
                              );
                              return invalidate(
                                {
                                  ...p,
                                  nodes: p.nodes.map((n) =>
                                    n.id === selected
                                      ? { ...n, instruction: e.target.value }
                                      : n,
                                  ),
                                },
                                idx,
                              );
                            })
                          }
                          placeholder="E.g. Focus on the mobile experience. Use our PRD template. Include failure scenarios."
                          rows={5}
                        />
                      </label>
                      {node.type === "brief" && <div className={s.briefInputBox}><strong>Already have a brief or BRD?</strong><p>Add it here, along with discovery notes or images. This step creates a new draft from your inputs. Remove the step if you don’t need another brief.</p><button className={s.secondary} disabled={!!busy} onClick={() => startSource("context")}><Icon name="upload" size={16} /> Add document or image</button><button className={s.textLink} onClick={() => setTab("inputs")}>View project inputs →</button></div>}
                      <div className={s.contextSummary}>
                        <Icon name="link" size={16} />
                        <span>
                          Uses your project inputs, confirmed rules and preceding
                          current documents.
                        </span>
                      </div>
                      <button
                        className={s.primary}
                        disabled={!!busy || configured === false}
                        onClick={() => run([node.id])}
                      >
                        <Icon name="spark" size={16} />
                        {artifact ? "Regenerate draft" : "Generate this step"}
                      </button>
                      {artifact && (
                        <button
                          className={s.secondary}
                          onClick={() =>
                            setTab(
                              node.type === "prototype"
                                ? "prototype"
                                : "documents",
                            )
                          }
                        >
                          Open output <Icon name="arrow" size={16} />
                        </button>
                      )}
                      <div className={s.sideDivider} />
                      <div className={s.inspectorStats}>
                        <span>
                          State<b>{statusLabel(artifact)}</b>
                        </span>
                        <span>
                          Model<b>{artifact?.model || "OpenAI"}</b>
                        </span>
                      </div>
                      <div className={s.reorderButtons}>
                        <button
                          disabled={!!busy || p.nodes[0].id === node.id}
                          onClick={() =>
                            change((p) =>
                              reorder(
                                p,
                                node.id,
                                p.nodes[
                                  p.nodes.findIndex((n) => n.id === node.id) - 1
                                ].id,
                              ),
                            )
                          }
                        >
                          Move up ↑
                        </button>
                        <button
                          disabled={!!busy || p.nodes.at(-1).id === node.id}
                          onClick={() =>
                            change((p) => {
                              const i = p.nodes.findIndex(
                                (n) => n.id === node.id,
                              );
                              return reorder(
                                p,
                                node.id,
                                p.nodes[i + 2]?.id || null,
                              );
                            })
                          }
                        >
                          Move down ↓
                        </button>
                      </div>
                      <button
                        className={s.dangerLink}
                        disabled={!!busy}
                        onClick={() => setModal("removeNode")}
                      >
                        <Icon name="trash" size={14} /> Remove step
                      </button>
                    </>
                  ) : (
                    <>
                      <div className={s.inspectorHeading}>
                        <Icon name="spark" size={22} />
                        <h2>Make it your workflow.</h2>
                      </div>
                      <p className={s.subtle}>
                        Start with the problem. Add the documents your team
                        actually needs.
                      </p>
                      <label className={s.field}>
                        Project goal (optional)
                        <textarea
                          aria-label="Project goal"
                          rows={8}
                          maxLength={16000}
                          disabled={!!busy}
                          value={p.brief}
                          onChange={(e) =>
                            change((p) =>
                              updateContext(p, { brief: e.target.value }),
                            )
                          }
                          placeholder="What are you building? Who is it for? What needs to change? Add goals, constraints and open questions."
                        />
                      </label>
                      <button
                        className={s.secondary}
                        disabled={!!busy}
                        onClick={() => startSource("context")}
                      >
                        <Icon name="plus" size={16} /> Add document or image
                      </button>
                      <div className={s.sideDivider} />
                      <div className={s.inspectorStats}>
                        <span>
                          Source documents<b>{p.sources.length}</b>
                        </span>
                        <span>
                          Confirmed rules
                          <b>{p.rules.filter((r) => r.approved).length}</b>
                        </span>
                      </div>
                      <div className={s.tip}>
                        <Icon name="shield" />
                        <p>
                          AI drafts. You decide.
                          <small>
                            Nothing is reviewed automatically. Read the evidence
                            before accepting a rule or document.
                          </small>
                        </p>
                      </div>
                    </>
                  )}
                  {p.sources.length > 0 && (
                    <div className={s.sourceMini}>
                      <span className={s.eyebrow}>PROJECT SOURCES</span>
                      {p.sources.map((source) => (
                        <button
                          key={source.id}
                          disabled={!!busy}
                          onClick={() => startSource(source.kind, source)}
                        >
                          <Icon
                            name={
                              source.kind === "standard" ? "shield" : "brief"
                            }
                            size={14}
                          />
                          <span>{source.name}</span>
                          <Icon name="chevron" size={12} />
                        </button>
                      ))}
                    </div>
                  )}
                </aside>
              </>
            )}
            {tab === "documents" && (
              <div className={s.documents}>
                <section className={s.documentContent}>
                  <div className={s.outputHeading}>
                    <div><span className={s.eyebrow}>{busy === node?.id ? "CREATING YOUR DOCUMENT" : artifact ? "YOUR CREATED DOCUMENT" : "YOUR DOCUMENT"}</span><h2>{node ? TYPE[node.type].label : "Product requirements (PRD)"}</h2></div>
                    <label>Open document<select aria-label="Open document" value={selected || ""} onChange={e => { const target = p.nodes.find(n => n.id === e.target.value); setSelected(target.id); setTab(documentView(target)); setEditing(false); }}><option value="" disabled>Select a document</option>{p.nodes.filter(n => n.artifact || n.id === selected || n.type === "requirements").map(n => <option key={n.id} value={n.id}>{TYPE[n.type].label} · {statusLabel(n.artifact)}</option>)}</select></label>
                  </div>
                  {artifact && node.type === "brief" && !prd?.artifact && <div className={s.outputHint}><span>This is a short product brief. Create a PRD for detailed requirements and acceptance criteria.</span><button className={s.primary} disabled={!!busy || !hasInputs || configured === false} onClick={createPrd}>Create PRD <Icon name="arrow" size={15}/></button></div>}
                  {!node ? (
                    <Empty
                      icon="brief"
                      title="Create your first PRD."
                      text="Bring your existing documents or describe your idea. Your draft will appear here."
                    ><button className={s.primary} onClick={() => setTab("inputs")}>Add project inputs</button></Empty>
                  ) : !artifact ? (
                    <Empty
                      icon={TYPE[node.type].icon}
                      title={busy === node.id ? `Creating your ${node.type === "requirements" ? "PRD" : TYPE[node.type].label.toLowerCase()}…` : `${TYPE[node.type].label}, ready to create.`}
                      text={busy === node.id ? "We’re turning your inputs into a readable draft. It will open here automatically; you can keep this page open." : "Uses your uploaded files, project goal and confirmed standards. Missing information is flagged for your review."}
                    >
                      <button
                        className={s.primary}
                        disabled={!!busy || configured === false}
                        onClick={() => hasInputs ? run([node.id]) : setTab("inputs")}
                      >
                        <Icon name="spark" size={16} /> {busy === node.id ? "Creating…" : !hasInputs ? "Add project inputs" : node.type === "requirements" ? "Create PRD" : "Create document"}
                      </button>
                    </Empty>
                  ) : (
                    <>
                      <div className={s.docToolbar}>
                        <span
                          className={`${s.status} ${artifact.status === "approved" ? s.approved : artifact.status === "stale" ? s.stale : ""}`}
                        >
                          {statusLabel(artifact)}
                        </span>
                        <div>
                          <button disabled={!!busy || exporting} onClick={() => exportAs("docx", selected)}><Icon name="export" size={15}/>{exporting ? "Preparing…" : "Download Word"}</button>
                          <button
                            disabled={!!busy}
                            onClick={() => {
                              if (!editing)
                                change((p) =>
                                  checkpoint(p, selected, "Before manual edit"),
                                );
                              setEditing(!editing);
                            }}
                          >
                            <Icon name={editing ? "check" : "edit"} size={15} />
                            {editing ? "Finish editing" : "Edit"}
                          </button>
                          {documentQueries(p, node).length > 0 && <button disabled={!!busy} onClick={showQuestions}>Resolve questions <span className={s.questionCount}>{documentQueries(p, node).filter(q => q.status === "open").length}</span></button>}
                          <details className={s.documentActions}><summary>More actions <span aria-hidden="true">▾</span></summary><div>
                            <button disabled={!!busy || configured === false} onClick={e => { e.currentTarget.closest("details").open = false; run([node.id]); }}><Icon name="spark" size={15} />Regenerate</button>
                            <button disabled={!!busy} onClick={e => { e.currentTarget.closest("details").open = false; setModal("approve"); }}><Icon name="check" size={15} />Mark reviewed</button>
                          </div></details>
                          {node.type === "requirements" && <button className={s.continueAction} disabled={!!busy} onClick={() => setModal("next")}>Continue with this PRD <Icon name="arrow" size={15}/></button>}
                        </div>
                      </div>
                      {artifact.status === "stale" && (
                        <div className={s.notice}>
                          The context or workflow changed. Regenerate this
                          document before marking it reviewed.
                        </div>
                      )}
                      <div className={s.paper}>
                        <span className={s.eyebrow}>
                          {TYPE[node.type].label.toUpperCase()} /{" "}
                          {artifact.model || "AI DRAFT"}
                        </span>
                        <h1>{artifact.title}</h1>
                        <p className={s.docSummary}>{artifact.summary}</p>
                        <div className={s.paperMeta}>
                          <span>{artifact.items.length} linked items</span>
                          <span>
                            {artifact.approval
                              ? `Reviewed locally · ${artifact.approval.by}`
                              : "Human review required"}
                          </span>
                        </div>
                        {editing ? (
                          <label className={s.field}>
                            Document content (Markdown)
                            <textarea
                              className={s.markdownEditor}
                              value={artifact.content}
                              onChange={(e) =>
                                updateDoc({ content: e.target.value })
                              }
                            />
                          </label>
                        ) : (
                          <div className={s.prose}>
                            <Markdown>{artifact.content}</Markdown>
                          </div>
                        )}
                        <div className={s.artifactItems}>
                          {artifact.items.map((item) => (
                            <article key={item.id} className={s.artifactItem}>
                              <div className={s.itemTitle}>
                                <code>{item.id}</code>
                                {editing ? (
                                  <input
                                    aria-label={`${item.id} title`}
                                    value={item.title}
                                    onChange={(e) =>
                                      editItem(item.id, {
                                        title: e.target.value,
                                      })
                                    }
                                  />
                                ) : (
                                  <h3>{item.title}</h3>
                                )}
                              </div>
                              {editing ? (
                                <>
                                  <label className={s.field}>
                                    Detail
                                    <textarea
                                      value={item.detail}
                                      rows={4}
                                      onChange={(e) =>
                                        editItem(item.id, {
                                          detail: e.target.value,
                                        })
                                      }
                                    />
                                  </label>
                                  <label className={s.field}>
                                    Acceptance criteria · one per line
                                    <textarea
                                      value={item.acceptanceCriteria.join("\n")}
                                      onChange={(e) =>
                                        editItem(item.id, {
                                          acceptanceCriteria:
                                            e.target.value.split("\n"),
                                        })
                                      }
                                    />
                                  </label>
                                </>
                              ) : (
                                <>
                                  <p>{item.detail}</p>
                                  {item.acceptanceCriteria.length > 0 && (
                                    <ul>
                                      {item.acceptanceCriteria.map((a, i) => (
                                        <li key={i}>{a}</li>
                                      ))}
                                    </ul>
                                  )}
                                </>
                              )}
                              <div className={s.itemLinks}>
                                {item.requirementIds.map((id) => (
                                  <span key={id}>
                                    <Icon name="link" size={11} />
                                    {id}
                                  </span>
                                ))}
                                {item.sourceIds.map((id) => (
                                  <button
                                    key={id}
                                    onClick={() => {
                                      const source = p.sources.find(
                                        (s) => s.id === id,
                                      );
                                      if (source)
                                        startSource(source.kind, source);
                                    }}
                                  >
                                    <Icon name="brief" size={11} />
                                    {p.sources.find((s) => s.id === id)?.name ||
                                      id}
                                  </button>
                                ))}
                              </div>
                            </article>
                          ))}
                        </div>
                        <div id="document-questions" tabIndex={-1} className={s.questionAnchor}><QueryReview key={node.id} project={p} node={node} busy={!!busy} configured={configured} onResolve={resolveQuery} onUpdate={() => run([node.id])} /></div>
                        {node.type === "requirements" && <div className={s.continueBar}><div><strong>Happy with this draft?</strong><p>You can move on with questions still open.</p></div><button className={s.primary} disabled={!!busy} onClick={() => setModal("next")}>Continue with this PRD <Icon name="arrow" size={16}/></button></div>}

                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
            {tab === "standards" && (
              <section className={s.standards}>
                <div className={s.sectionHeading}>
                  <div>
                    <span className={s.eyebrow}>
                      THE WAY YOUR COMPANY WORKS
                    </span>
                    <h2>Bring your own standards.</h2>
                    <p>
                      Policies, templates, accessibility rules, writing
                      guidelines. You decide what applies.
                    </p>
                  </div>
                  <button
                    className={s.primary}
                    disabled={!!busy}
                    onClick={() => startSource("standard")}
                  >
                    <Icon name="plus" size={16} /> Add standard
                  </button>
                </div>
                <div className={s.standardsGrid}>
                  <div>
                    <h3>
                      Source library{" "}
                      <span>
                        {p.sources.filter((s) => s.kind === "standard").length}
                      </span>
                    </h3>
                    {p.sources
                      .filter((s) => s.kind === "standard")
                      .map((source) => (
                        <button
                          className={s.standardSource}
                          key={source.id}
                          disabled={!!busy}
                          onClick={() => startSource("standard", source)}
                        >
                          <span className={`${s.iconTile} ${s.violet}`}>
                            <Icon name="shield" />
                          </span>
                          <span>
                            <strong>{source.name}</strong>
                            <small>
                              {source.text.length.toLocaleString()} characters ·{" "}
                              {source.id}
                            </small>
                          </span>
                          <Icon name="edit" size={16} />
                        </button>
                      ))}
                    {!p.sources.some((s) => s.kind === "standard") && (
                      <div className={s.standardEmpty}>
                        <Icon name="upload" size={28} />
                        <h3>Your standards start here.</h3>
                        <p>
                          Upload a document or paste an excerpt. No company
                          policy is assumed.
                        </p>
                        <button
                          disabled={!!busy}
                          onClick={() => startSource("standard")}
                        >
                          Add your first standard ↗
                        </button>
                      </div>
                    )}
                    <button
                      className={s.secondary}
                      disabled={
                        !!busy ||
                        configured === false ||
                        !p.sources.some((s) => s.kind === "standard")
                      }
                      onClick={extractRules}
                    >
                      <Icon name="spark" size={16} /> Extract rules with AI
                    </button>
                    <p className={s.fine}>
                      Extracting again replaces the rule proposals and clears
                      their confirmation. Original source documents stay intact.
                    </p>
                  </div>
                  <div>
                    <h3>
                      Rules to work by{" "}
                      <span>
                        {p.rules.filter((r) => r.approved).length} confirmed
                      </span>
                    </h3>
                    {!p.rules.length && (
                      <p className={s.subtle}>
                        Extract rules from your standards, then check each
                        source passage before confirming it.
                      </p>
                    )}
                    {p.rules.map((rule) => (
                      <article className={s.rule} key={rule.id}>
                        <div>
                          <code>{rule.id}</code>
                          <span>
                            {rule.approved
                              ? "Confirmed for this project"
                              : "Needs confirmation"}
                          </span>
                        </div>
                        <h4>{rule.title}</h4>
                        <p>{rule.detail}</p>
                        <blockquote>{rule.quote}</blockquote>
                        <small>
                          {p.sources.find((s) => s.id === rule.sourceId)?.name}
                        </small>
                        <label>
                          <input
                            type="checkbox"
                            checked={rule.approved}
                            disabled={!!busy || !groundedRule(rule, p.sources)}
                            onChange={(e) =>
                              change((p) =>
                                record(
                                  invalidate({
                                    ...p,
                                    rules: p.rules.map((r) =>
                                      r.id === rule.id
                                        ? { ...r, approved: e.target.checked }
                                        : r,
                                    ),
                                  }),
                                  `Policy rule ${rule.id} ${e.target.checked ? "confirmed" : "unconfirmed"} for this project.`,
                                ),
                              )
                            }
                          />{" "}
                          I reviewed the source; this rule applies.
                        </label>
                      </article>
                    ))}
                  </div>
                </div>
              </section>
            )}
            {tab === "trace" && (
              <section className={s.standards}>
                <div className={s.sectionHeading}>
                  <div>
                    <span className={s.eyebrow}>FOLLOW THE REASONING</span>
                    <h2>Nothing gets lost in translation.</h2>
                    <p>
                      Proposed links between requirements and delivery items.
                      Review the substance, not just the connection.
                    </p>
                  </div>
                </div>
                {traceRows(p).length ? (
                  <div className={s.traceTable}>
                    <div className={s.traceHead}>
                      <span>REQUIREMENT</span>
                      <span>CONNECTED OUTPUTS</span>
                      <span>TEST LINKS</span>
                    </div>
                    {traceRows(p).map((r) => (
                      <div className={s.traceRow} key={r.nodeId + r.id}>
                        <div>
                          <code>{r.id}</code>
                          <strong>{r.title}</strong>
                          <small>
                            {r.status === "stale"
                              ? "Needs update"
                              : "Proposed requirement"}
                          </small>
                        </div>
                        <div>
                          {r.links.length ? (
                            r.links.map((l) => (
                              <button
                                key={l.nodeId + l.id}
                                onClick={() => {
                                  setSelected(l.nodeId);
                                  setTab("documents");
                                }}
                              >
                                <Icon name={TYPE[l.type].icon} size={14} />
                                {l.id}
                                {l.status === "stale" ? " · stale" : ""}
                              </button>
                            ))
                          ) : (
                            <span>No links yet</span>
                          )}
                        </div>
                        <span
                          className={
                            r.links.some(
                              (l) => l.type === "tests" && l.status !== "stale",
                            )
                              ? s.covered
                              : s.missing
                          }
                        >
                          {
                            r.links.filter(
                              (l) => l.type === "tests" && l.status !== "stale",
                            ).length
                          }{" "}
                          current
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    icon="link"
                    title="Give every requirement a thread."
                    text="Add and generate a Requirements step before stories or tests to see their proposed connections here."
                  />
                )}
                <p className={s.fine}>
                  A linked test is a specification, not proof that a test ran or
                  passed. Document review labels are self-reported. Use team change reviews for an authenticated second-person decision.
                </p>
                <div className={s.activity}>
                  <h3>Project activity</h3>
                  {p.activity.length ? (
                    p.activity.slice(0, 12).map((a) => (
                      <p key={a.id}>
                        <Icon name="clock" size={14} />
                        <span>{a.message}</span>
                        <time>
                          {new Date(a.at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </p>
                    ))
                  ) : (
                    <p>Your project changes will appear here.</p>
                  )}
                </div>
              </section>
            )}
          </div>
          <footer className={s.workspaceFooter}>
            <span>
              <i />{" "}
              {busy
                ? "AI working"
                : configured
                  ? "AI ready"
                  : "AI unavailable"}{" "}
              <span>·</span> OpenAI
            </span>
            <span>
              Draft → Review → Deliver <Icon name="arrow" size={12} />
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className={s.toast} role="status">
          <Icon name="check" size={18} />
          {toast}
        </div>
      )}
      <input
        ref={backupInput}
        type="file"
        accept=".json"
        hidden
        onChange={(e) => importBackup(e.target.files[0])}
      />
      {modal && (
        <div
          className={s.modalBackdrop}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            ref={dialogRef}
            tabIndex={-1}
            className={s.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) setModal(null);
              if (e.key === "Tab") {
                const controls = [
                  ...e.currentTarget.querySelectorAll(
                    "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]",
                  ),
                ].filter((el) => el.getClientRects().length);
                const first = controls[0],
                  last = controls.at(-1);
                if (!first) {
                  e.preventDefault();
                  return;
                }
                if (
                  e.shiftKey &&
                  (document.activeElement === first ||
                    document.activeElement === e.currentTarget)
                ) {
                  e.preventDefault();
                  last.focus();
                } else if (
                  !e.shiftKey &&
                  (document.activeElement === last ||
                    document.activeElement === e.currentTarget)
                ) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <button
              className={s.modalClose}
              aria-label="Close dialog"
              disabled={!!busy}
              onClick={() => setModal(null)}
            >
              <Icon name="close" />
            </button>
            {modal === "next" && (
              <>
                <span className={s.eyebrow}>FROM PRD TO PRODUCT</span>
                <h2 id="modal-title">What would you like to create?</h2>
                <p className={s.nextIntro}>Your PRD stays as it is. Each new output uses it together with your sources and saved answers.</p>
                <div className={s.nextChoices}>
                  {[["prototype", "Working prototype", "Try interactive screens, forms and key journeys."], ["stories", "User stories", "Turn requirements into stories with acceptance criteria."], ["tests", "Test plan", "Check expected behaviour, exceptions and edge cases."]].map(([type, label, description]) => {
                    const existing = p.nodes.find(n => n.type === type)?.artifact;
                    return <button key={type} disabled={!!busy || (!existing && configured === false)} onClick={() => continueWithPrd(type)}><Icon name={TYPE[type].icon}/><span><strong>{label}</strong><small>{description}</small><b>{existing ? "Open existing output" : `Create ${type === "prototype" ? "prototype" : type === "stories" ? "user stories" : "test plan"}`} →</b></span></button>;
                  })}
                </div>
                <p className={s.nextNote}>{documentQueries(p, node).filter(q => q.status === "open").length} open queries carry forward. Continuing does not approve the PRD or close these queries.</p>
                {configured === false && <p>AI is temporarily unavailable. You can still open existing outputs.</p>}
              </>
            )}
            {modal === "prototype-setup" && prototypeRequest && <PrototypeSetup
              settings={p.nodes.find(n => n.id === prototypeRequest.nodeId)?.prototypeSettings}
              existing={!!p.nodes.find(n => n.id === prototypeRequest.nodeId)?.artifact}
              onCancel={() => setModal(null)}
              onSubmit={settings => {
                const request = prototypeRequest;
                change(p => record({ ...p, nodes: p.nodes.map(n => request.ids.includes(n.id) && n.type === "prototype" ? { ...n, prototypeSettings: settings } : n) }, "Prototype device and journey selected."));
                setModal(null);
                run(request.ids, request.sourceNodeId, true);
              }}
            />}
            {modal === "steps" && (
              <>
                <span className={s.eyebrow}>YOUR WORKFLOW, YOUR WAY</span>
                <h2 id="modal-title">What happens next?</h2>
                <div className={s.stepPicker}>
                  {NODE_TYPES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        add(t.id);
                        setModal(null);
                      }}
                    >
                      <span className={`${s.iconTile} ${s[t.color]}`}>
                        <Icon name={t.icon} />
                      </span>
                      <span>
                        <b>{t.label}</b>
                        <small>{t.description}</small>
                      </span>
                      <Icon name="plus" size={16} />
                    </button>
                  ))}
                </div>
              </>
            )}
            {modal === "source" && (
              <>
                <span className={s.eyebrow}>
                  {sourceKind === "standard"
                    ? "COMPANY STANDARDS"
                    : "PROJECT INPUT"}
                </span>
                <h2 id="modal-title">
                  {sourceEdit
                    ? "Edit your source."
                    : "Bring in your existing work."}
                </h2>
                <p className={s.subtle}>
                  Add a BRD, discovery notes, research, screenshots or diagrams. Documents are read for text;
                  images are sent to OpenAI to interpret. Review the extracted content below.
                  {shared?.demo ? " Demo changes stay in this tab." : shared ? " Added content autosaves to your team workspace." : " Added content is saved in this browser."}
                  {" "}Original files are not retained. Added content is sent to OpenAI when you generate outputs.
                </p>
                <label
                  className={s.uploadZone}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!busy) { if (e.dataTransfer.files.length > 1) setError("Add one file at a time so you can review each input."); else upload(e.dataTransfer.files[0]); }
                  }}
                >
                  <Icon name="upload" size={22} />
                  <strong>
                    {busy === "upload"
                      ? "Reading your file…"
                      : "Drop a file or choose from your computer"}
                  </strong>
                  <span>PDF, DOCX, XLSX, TXT, MD, CSV, JSON, PNG, JPG or WebP · up to 3 MB</span>
                  <input
                    ref={fileInput}
                    disabled={!!busy}
                    type="file"
                    accept={INPUT_ACCEPT}
                    onChange={(e) => upload(e.target.files[0])}
                  />
                </label>
                <label className={s.field}>
                  Input name
                  <input
                    autoFocus
                    maxLength={150}
                    value={sourceName}
                    disabled={!!busy}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder={sourceKind === "standard" ? "E.g. Accessibility standard v2.1" : "E.g. Onboarding BRD or customer discovery"}
                  />
                </label>
                <label className={s.field}>
                  {sourceImage ? "Check the AI-read image notes" : "Review or paste content"}
                  <textarea
                    rows={7}
                    maxLength={40000}
                    value={sourceText}
                    disabled={!!busy}
                    onChange={(e) => setSourceText(e.target.value)}
                    placeholder="Or paste the relevant text here…"
                  />
                </label>
                <span className={s.fine}>
                  {sourceText.length.toLocaleString()} / 40,000 characters ·{" "}
                  {sourceKind === "standard"
                    ? "Extract and confirm rules after saving."
                    : "Used by your workflow. You do not need to rewrite it as a brief."}
                </span>
                {error && (
                  <p className={s.inlineError} role="alert">
                    {error}
                  </p>
                )}
                <div className={s.modalActions}>
                  {sourceEdit && (
                    <button
                      className={s.dangerLink}
                      disabled={!!busy}
                      onClick={() => setModal("removeSource")}
                    >
                      Remove source
                    </button>
                  )}
                  <button
                    className={s.primary}
                    disabled={!!busy}
                    onClick={saveSource}
                  >
                    {sourceEdit ? "Save changes" : "Add to project"} <Icon name="arrow" size={16} />
                  </button>
                </div>
              </>
            )}
            {modal === "context" && (
              <>
                <span className={s.eyebrow}>THE STARTING POINT</span>
                <h2 id="modal-title">What are we building?</h2>
                <label className={s.field}>
                  Project brief
                  <textarea
                    autoFocus
                    rows={12}
                    maxLength={16000}
                    value={p.brief}
                    onChange={(e) =>
                      change((p) => updateContext(p, { brief: e.target.value }))
                    }
                  />
                </label>
                <p className={s.fine}>
                  Include audience, problem, goals, scope, constraints and
                  decisions. Changes mark existing outputs for review.
                </p>
                <button className={s.primary} onClick={() => setModal(null)}>
                  Done <Icon name="check" size={16} />
                </button>
              </>
            )}
            {modal === "export" && (
              <>
                <span className={s.eyebrow}>TAKE YOUR WORK WITH YOU</span>
                <h2 id="modal-title">Ready for the next conversation.</h2>
                <p className={s.subtle}>
                  Exports include draft status and open decisions.
                  {shared ? " Your initiative autosaves online. Download a backup for an independent copy." : " This local studio saves only in this browser. Export regularly, or use Team workspace for online saving."}
                </p>
                <div className={s.exportOptions}>
                  {[
                    [
                      "docx",
                      "Word document",
                      "A readable delivery package for stakeholders.",
                    ],
                    [
                      "csv",
                      "Spreadsheet / Jira CSV",
                      "Structured items with requirement and source IDs. Map fields during import.",
                    ],
                    [
                      "md",
                      "Markdown",
                      "Portable content for your docs or coding agent.",
                    ],
                    [
                      "json",
                      "Project backup",
                      "Everything needed to reopen this project in StockedBy.",
                    ],
                  ].map(([format, name, desc]) => (
                    <button
                      key={format}
                      disabled={exporting || (format !== "json" && !generated)}
                      onClick={() => exportAs(format)}
                    >
                      <span>{format.toUpperCase()}</span>
                      <div>
                        <b>{name}</b>
                        <small>{desc}</small>
                      </div>
                      <Icon name="export" size={18} />
                    </button>
                  ))}
                </div>
              </>
            )}
            {modal === "approve" && (
              <>
                <span className={s.eyebrow}>HUMAN REVIEW</span>
                <h2 id="modal-title">
                  Mark this {TYPE[node.type].short.toLowerCase()} reviewed?
                </h2>
                {approvalProblems(p, node).length ? (
                  <>
                    <p className={s.subtle}>
                      Address these before marking this document reviewed:
                    </p>
                    <ul className={s.problems}>
                      {approvalProblems(p, node).map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                    <button
                      className={s.primary}
                      onClick={() => setModal(null)}
                    >
                      Back to document
                    </button>
                  </>
                ) : (
                  <>
                    <p className={s.subtle}>
                      Confirm you reviewed the content, source links and any
                      warnings. This records a local review; it is not an
                      authenticated organisational approval.
                    </p>
                    <label className={s.field}>
                      Your name
                      <input
                        autoFocus
                        value={reviewer}
                        maxLength={80}
                        onChange={(e) => setReviewer(e.target.value)}
                        placeholder="Reviewer name"
                      />
                    </label>
                    <button
                      className={s.primary}
                      disabled={!reviewer.trim()}
                      onClick={approve}
                    >
                      <Icon name="check" size={16} /> Mark reviewed
                    </button>
                  </>
                )}
              </>
            )}
            {modal === "removeNode" && (
              <>
                <h2 id="modal-title">Remove this step?</h2>
                <p className={s.subtle}>
                  This removes {TYPE[node.type].label} and its document from
                  this project. Remaining outputs will need review. Export a
                  backup first if you want to keep it.
                </p>
                <div className={s.modalActions}>
                  <button
                    className={s.secondary}
                    onClick={() => setModal(null)}
                  >
                    Keep step
                  </button>
                  <button
                    className={s.primary}
                    onClick={() => {
                      change((p) =>
                        record(
                          invalidate({
                            ...p,
                            nodes: p.nodes.filter((n) => n.id !== selected),
                          }),
                          "Workflow step removed.",
                        ),
                      );
                      setSelected(null);
                      setModal(null);
                    }}
                  >
                    Remove step
                  </button>
                </div>
              </>
            )}
            {modal === "removeSource" && (
              <>
                <h2 id="modal-title">Remove this source?</h2>
                <p className={s.subtle}>
                  Its extracted rules will be removed and all existing outputs
                  marked for review. Export a backup first if needed.
                </p>
                <div className={s.modalActions}>
                  <button
                    className={s.secondary}
                    onClick={() => setModal("source")}
                  >
                    Keep source
                  </button>
                  <button
                    className={s.primary}
                    onClick={() => {
                      change((p) =>
                        updateContext(p, {
                          sources: p.sources.filter((s) => s.id !== sourceEdit),
                          rules: p.rules.filter(
                            (r) => r.sourceId !== sourceEdit,
                          ),
                        }),
                      );
                      setModal(null);
                    }}
                  >
                    Remove source
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Empty({ icon, title, text, children }) {
  return (
    <div className={s.empty}>
      <span>
        <Icon name={icon} size={30} />
      </span>
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}

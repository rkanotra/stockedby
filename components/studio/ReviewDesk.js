"use client";
import { useState } from "react";
import {
  reviewQueue,
  saveDecision,
  checkpoint,
  compareArtifacts,
  restoreVersion,
} from "@/lib/studio/review";
import { record } from "@/lib/studio/model";
import w from "./workbench.module.css";
export default function ReviewDesk({ project, change, openDocument, busy }) {
  const [view, setView] = useState("queue"),
    [filter, setFilter] = useState("all"),
    [title, setTitle] = useState(""),
    [decision, setDecision] = useState(""),
    [owner, setOwner] = useState(""),
    [refs, setRefs] = useState([]),
    [status, setStatus] = useState("accepted"),
    [version, setVersion] = useState(""),
    [error, setError] = useState("");
  const queue = reviewQueue(project),
    feedback = (project.prototypeFeedback || []).filter((f) => !f.resolved),
    versions = project.versions || [],
    v = versions.find((v) => v.id === version),
    current = v && project.nodes.find((n) => n.id === v.nodeId)?.artifact,
    diff = v && compareArtifacts(v.artifact, current),
    requirements = project.nodes
      .filter((n) => n.type === "requirements")
      .flatMap((n) => n.artifact?.items || []);
  return (
    <div className={w.desk}>
      <div className={w.heading}>
        <div>
          <span className={w.kicker}>REVIEW & DECISIONS</span>
          <h2>Make the gaps actionable.</h2>
          <p>
            A review queue built from your actual documents, linked tests and
            prototype feedback.
          </p>
        </div>
        <span className={w.tag}>Local review records</span>
      </div>
      <div className={w.metrics}>
        <div>
          <b>{queue.filter((q) => q.severity === "blocker").length}</b>
          <span>Blocking findings</span>
        </div>
        <div>
          <b>{queue.filter((q) => q.severity === "decision").length}</b>
          <span>Open questions</span>
        </div>
        <div>
          <b>{feedback.length}</b>
          <span>Prototype observations</span>
        </div>
        <div>
          <b>
            {
              (project.decisions || []).filter((d) => d.status === "accepted")
                .length
            }
          </b>
          <span>Accepted decisions</span>
        </div>
      </div>
      <div className={w.subnav}>
        {[
          ["queue", "Review queue"],
          ["decisions", "Decision log"],
          ["versions", "Version history"],
        ].map(([key, label]) => (
          <button
            key={key}
            aria-pressed={view === key}
            onClick={() => setView(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && (
        <div className={w.warning} role="alert">
          {error}
        </div>
      )}
      {view === "queue" && (
        <>
          <div className={w.row}>
            <h3>What needs attention</h3>
            <select
              aria-label="Filter review queue"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All findings</option>
              <option value="blocker">Blocking</option>
              <option value="decision">Questions</option>
              <option value="warning">Warnings</option>
            </select>
          </div>
          {!queue.length && !feedback.length && (
            <div className={w.empty}>
              <h3>No open findings recorded.</h3>
              <p>
                Generate a readiness review and inspect the evidence before
                sign-off. An empty queue is not a compliance certification.
              </p>
            </div>
          )}
          {queue
            .filter((q) => filter === "all" || q.severity === filter)
            .map((q) => (
              <article className={w.queueItem} key={q.id}>
                <span className={`${w.severity} ${w[q.severity]}`}>
                  {q.severity === "decision"
                    ? "?"
                    : q.severity === "blocker"
                      ? "!"
                      : "·"}
                </span>
                <div>
                  <small>{q.category}</small>
                  <h3>{q.title}</h3>
                  <p>{q.detail}</p>
                </div>
                <div className={w.actions}>
                  <button onClick={() => openDocument(q.nodeId)}>
                    Inspect
                  </button>
                  <button
                    onClick={() => {
                      setTitle(q.title);
                      setView("decisions");
                    }}
                  >
                    Record decision
                  </button>
                </div>
              </article>
            ))}
          {filter === "all" &&
            feedback.map((f) => (
              <article className={w.queueItem} key={f.id}>
                <span className={w.severity}>↗</span>
                <div>
                  <small>
                    Prototype · {f.screenId} · {f.requirementIds?.join(", ")}
                  </small>
                  <h3>{f.note}</h3>
                </div>
                <button
                  disabled={busy}
                  onClick={() =>
                    change((p) =>
                      record(
                        {
                          ...p,
                          prototypeFeedback: p.prototypeFeedback.map((x) =>
                            x.id === f.id ? { ...x, resolved: true } : x,
                          ),
                        },
                        "Prototype observation resolved locally.",
                      ),
                    )
                  }
                >
                  Mark resolved
                </button>
              </article>
            ))}
        </>
      )}
      {view === "decisions" && (
        <div className={w.twoCol}>
          <section className={w.card}>
            <h3>Record a decision</h3>
            <p className={w.small}>
              Accepted decisions enter the AI context and mark existing outputs
              for regeneration. This records a decision locally; it is not an
              authenticated company approval.
            </p>
            <label className={w.field}>
              Question or decision title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                placeholder="How should failed invitations be handled?"
              />
            </label>
            <label className={w.field}>
              Decision and rationale
              <textarea
                rows={5}
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                maxLength={4000}
                placeholder="We will… because…"
              />
            </label>
            <label className={w.field}>
              Accountable owner
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                maxLength={100}
                placeholder="Name or role"
              />
            </label>
            <label className={w.field}>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="accepted">
                  Accepted — use in next generation
                </option>
                <option value="deferred">
                  Deferred — retain for discussion
                </option>
              </select>
            </label>
            <div className={w.chips}>
              {requirements.map((r) => (
                <label key={r.id}>
                  <input
                    type="checkbox"
                    checked={refs.includes(r.id)}
                    onChange={(e) =>
                      setRefs(
                        e.target.checked
                          ? [...refs, r.id]
                          : refs.filter((id) => id !== r.id),
                      )
                    }
                  />
                  {r.id}
                </label>
              ))}
            </div>
            <button
              disabled={
                busy || !title.trim() || !decision.trim() || !owner.trim()
              }
              onClick={() => {
                try {
                  change((p) =>
                    saveDecision(p, {
                      title,
                      decision,
                      owner,
                      requirementIds: refs,
                      status,
                    }),
                  );
                  setTitle("");
                  setDecision("");
                  setRefs([]);
                  setError("");
                } catch (e) {
                  setError(e.message);
                }
              }}
            >
              Save decision
            </button>
          </section>
          <section>
            <h3>Decision trail</h3>
            {!(project.decisions || []).length && (
              <p className={w.small}>
                Your decisions and their rationale will appear here.
              </p>
            )}
            {(project.decisions || []).map((d) => (
              <article className={w.decision} key={d.id}>
                <div className={w.row}>
                  <span className={w.tag}>{d.status}</span>
                  <small>{new Date(d.at).toLocaleDateString()}</small>
                </div>
                <h3>{d.title}</h3>
                <p>{d.decision}</p>
                <small>
                  {d.owner || "Owner unassigned"} ·{" "}
                  {d.requirementIds?.join(", ") || "Project-wide"}
                </small>
              </article>
            ))}
          </section>
        </div>
      )}
      {view === "versions" && (
        <>
          <p className={w.small}>
            The last 12 snapshots are stored in this browser. Regeneration saves
            the preceding version. Restore marks it for reconciliation with
            current context.
          </p>
          <div className={w.actions}>
            {project.nodes
              .filter((n) => n.artifact)
              .map((n) => (
                <button
                  key={n.id}
                  disabled={busy}
                  onClick={() =>
                    change((p) => checkpoint(p, n.id, "Manual baseline"))
                  }
                >
                  Save baseline: {n.artifact.title}
                </button>
              ))}
          </div>
          <div className={w.versionGrid}>
            <aside>
              {versions.length === 0 && <p>No baselines yet.</p>}
              {versions.map((x) => (
                <button
                  className={w.version}
                  key={x.id}
                  aria-pressed={x.id === version}
                  onClick={() => setVersion(x.id)}
                >
                  <strong>{x.artifact.title}</strong>
                  <span>{x.label}</span>
                  <small>{new Date(x.at).toLocaleString()}</small>
                </button>
              ))}
            </aside>
            <section>
              {v && diff ? (
                <>
                  <div className={w.row}>
                    <h3>Baseline → current version</h3>
                    <button
                      disabled={busy}
                      onClick={() => change((p) => restoreVersion(p, v.id))}
                    >
                      Restore baseline
                    </button>
                  </div>
                  <div className={w.chips}>
                    <span>{diff.added.length} added</span>
                    <span>{diff.changed.length} changed</span>
                    <span>{diff.removed.length} removed</span>
                  </div>
                  {diff.narrativeChanged && (
                    <details open>
                      <summary>Narrative changed</summary>
                      <div className={w.diff}>
                        <pre>{v.artifact.content}</pre>
                        <pre>{current?.content || "Document removed"}</pre>
                      </div>
                    </details>
                  )}
                  {diff.changed.map((i) => (
                    <div key={i.after.id}>
                      <h4>
                        {i.after.id} · {i.after.title}
                      </h4>
                      <div className={w.diff}>
                        <pre>{JSON.stringify(i.before, null, 2)}</pre>
                        <pre>{JSON.stringify(i.after, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                  {diff.added.map((i) => (
                    <p className={w.added} key={i.id}>
                      + {i.id} · {i.title}
                    </p>
                  ))}
                  {diff.removed.map((i) => (
                    <p className={w.removed} key={i.id}>
                      − {i.id} · {i.title}
                    </p>
                  ))}
                  {v.artifact.prototype &&
                    JSON.stringify(v.artifact.prototype) !==
                      JSON.stringify(current?.prototype) && (
                      <details>
                        <summary>
                          Prototype behaviour changed — inspect structured diff
                        </summary>
                        <div className={w.diff}>
                          <pre>
                            {JSON.stringify(v.artifact.prototype, null, 2)}
                          </pre>
                          <pre>
                            {JSON.stringify(current?.prototype, null, 2)}
                          </pre>
                        </div>
                      </details>
                    )}
                </>
              ) : (
                <div className={w.empty}>
                  <h3>Select a baseline.</h3>
                  <p>
                    Compare requirements, acceptance criteria and screen
                    behaviour before accepting a revised draft.
                  </p>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

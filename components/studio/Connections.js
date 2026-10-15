"use client";
import { useState, useEffect } from "react";
import { exportCandidates, jiraDescription } from "@/lib/studio/connectors";
import {
  uid,
  record,
  updateContext,
  approvalProblems,
} from "@/lib/studio/model";
import w from "./workbench.module.css";
export default function Connections({ project, change, busy: generating }) {
  const [connections, setConnections] = useState({}),
    [provider, setProvider] = useState("jira"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [sites, setSites] = useState([]),
    [cloudId, setCloudId] = useState(""),
    [projects, setProjects] = useState([]),
    [projectKey, setProjectKey] = useState(""),
    [types, setTypes] = useState([]),
    [issueType, setIssueType] = useState(""),
    [keys, setKeys] = useState(""),
    [issues, setIssues] = useState([]),
    [url, setUrl] = useState(""),
    [design, setDesign] = useState(null),
    [mapping, setMapping] = useState({}),
    [preview, setPreview] = useState(null),
    [itemKey, setItemKey] = useState("");
  const disabled = busy || generating,
    candidates = exportCandidates(project),
    selected = candidates.find((c) => c.nodeId + ":" + c.item.id === itemKey),
    reqs = project.nodes
      .filter((n) => n.type === "requirements")
      .flatMap((n) => n.artifact?.items || []);
  useEffect(() => {
    let active = true;
    Promise.all(
      ["jira", "figma"].map(async (p) => {
        const r = await fetch("/api/studio/connectors/" + p);
        if (!r.ok) throw Error("Could not check connection status.");
        return [p, await r.json()];
      }),
    )
      .then((rows) => {
        if (active) setConnections(Object.fromEntries(rows));
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function task(fn) {
    if (disabled) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function action(action, extra = {}) {
    const r = await fetch("/api/studio/connectors/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        cloudId,
        projectKey,
        issueType,
        action,
        ...extra,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "The connection failed.");
    return d;
  }
  async function connect(p) {
    await task(async () => {
      const r = await fetch("/api/studio/connectors/" + p, { method: "POST" }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      window.location.assign(d.url);
    });
  }
  function addSources(sources) {
    if (
      project.sources.length +
        sources.filter((s) => !project.sources.some((x) => x.id === s.id))
          .length >
      20
    )
      throw Error(
        "The project supports 20 sources. Remove an unused source first.",
      );
    change((p) =>
      updateContext(p, {
        sources: [
          ...p.sources.filter((s) => !sources.some((x) => x.id === s.id)),
          ...sources,
        ],
      }),
    );
    setMessage("Source snapshots added. Existing outputs now need review.");
  }
  return (
    <div className={w.desk}>
      <div className={w.heading}>
        <div>
          <span className={w.kicker}>CONNECTED DELIVERY</span>
          <h2>Bring the context. Keep the control.</h2>
          <p>
            Read design and delivery context. Preview every Jira write before
            publishing.
          </p>
        </div>
        <span className={w.tag}>Session connections</span>
      </div>
      <div className={w.connectorGrid}>
        {[
          ["jira", "J", "Jira", "Issue context → reviewed delivery"],
          ["figma", "F", "Figma", "Design frames → linked requirements"],
        ].map(([id, letter, name, desc]) => (
          <button
            className={w.connectorCard}
            disabled={disabled}
            key={id}
            aria-pressed={provider === id}
            onClick={() => {
              setProvider(id);
              setError("");
              setPreview(null);
            }}
          >
            <span className={w.connectorLogo}>{letter}</span>
            <div>
              <h3>{name}</h3>
              <p>{desc}</p>
              <small>
                {!connections[id]
                  ? "Checking…"
                  : connections[id].connected
                    ? "Connected for this session"
                    : connections[id].configured
                      ? "Ready to connect"
                      : "Owner setup required"}
              </small>
            </div>
            <span>↗</span>
          </button>
        ))}
      </div>
      {error && (
        <div className={w.warning} role="alert">
          {error}
        </div>
      )}
      {message && (
        <div className={w.success} role="status">
          {message}
        </div>
      )}
      <section className={w.card}>
        <div className={w.row}>
          <div>
            <h3>{provider === "jira" ? "Jira Cloud" : "Figma"} connection</h3>
            <p className={w.small}>
              Your connection lasts up to one hour. Account credentials are
              excluded from project backups and AI requests.
            </p>
          </div>
          {connections[provider]?.connected ? (
            <button
              disabled={disabled}
              onClick={() =>
                task(async () => {
                  const r = await fetch("/api/studio/connectors/" + provider, {
                    method: "DELETE",
                  });
                  if (!r.ok) throw Error("Could not disconnect.");
                  setConnections({
                    ...connections,
                    [provider]: { ...connections[provider], connected: false },
                  });
                  setMessage(
                    "Local session disconnected. Revoke the app in your provider account to remove its authorization.",
                  );
                })
              }
            >
              Disconnect session
            </button>
          ) : (
            <button
              disabled={disabled || !connections[provider]?.configured}
              onClick={() => connect(provider)}
            >
              Connect {provider === "jira" ? "Jira" : "Figma"} ↗
            </button>
          )}
        </div>
        {!connections[provider]?.configured && (
          <details className={w.setup}>
            <summary>Connection setup · required before use</summary>
            <p>
              The StockedBy owner must register an OAuth app with{" "}
              {provider === "jira" ? "Atlassian" : "Figma"} and configure its
              client ID, client secret and the connector encryption secret on
              the hosting project. Customers then authorize their own account.
            </p>
            <p>Callback URL</p>
            <code>
              https://stockedby.com/api/studio/connectors/{provider}/callback
            </code>
            <p>
              Permissions:{" "}
              {provider === "jira"
                ? "read:jira-work and write:jira-work"
                : "file_content:read"}
              .
            </p>
            <a
              href={
                provider === "jira"
                  ? "https://developer.atlassian.com/console/myapps/"
                  : "https://www.figma.com/developers/apps"
              }
              target="_blank"
              rel="noreferrer"
            >
              Open provider developer console ↗
            </a>
            <p>
              This connection has not been authorized yet. You can still export
              Word, CSV, HTML and SVG from your workspace.
            </p>
          </details>
        )}
      </section>
      {provider === "jira" && (
        <div className={w.twoCol}>
          <section className={w.card}>
            <span className={w.kicker}>01 / READ CONTEXT</span>
            <h3>Import existing issues</h3>
            <button
              disabled={disabled || !connections.jira?.connected}
              onClick={() =>
                task(async () => {
                  const d = await action("sites");
                  setSites(d.sites);
                })
              }
            >
              Load authorized sites
            </button>
            <label className={w.field}>
              Jira site
              <select
                disabled={disabled}
                value={cloudId}
                onChange={(e) => {
                  setCloudId(e.target.value);
                  setProjects([]);
                  setProjectKey("");
                  setTypes([]);
                  setPreview(null);
                }}
              >
                <option value="">Select a site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={w.field}>
              Issue keys
              <input
                value={keys}
                onChange={(e) => setKeys(e.target.value)}
                placeholder="PROD-142, PROD-156"
                maxLength={500}
              />
            </label>
            <button
              disabled={disabled || !cloudId || !keys.trim()}
              onClick={() =>
                task(async () =>
                  setIssues((await action("import", { keys })).issues),
                )
              }
            >
              Preview issue context
            </button>
            {issues.map((i) => (
              <div className={w.scenario} key={i.key}>
                <a href={i.url} target="_blank" rel="noreferrer">
                  {i.key} ↗
                </a>
                <h4>{i.title}</h4>
                <small>
                  {i.status} · updated {new Date(i.updated).toLocaleString()}
                </small>
                <p>{i.text.slice(0, 500)}</p>
              </div>
            ))}
            {!!issues.length && (
              <button
                disabled={disabled}
                onClick={() =>
                  task(async () => {
                    addSources(
                      issues.map((i) => ({
                        id: "JIRA-" + cloudId + "-" + i.key,
                        kind: "context",
                        name: i.key + " · " + i.title,
                        text: (
                          "Issue: " +
                          i.url +
                          "\nStatus: " +
                          i.status +
                          "\nUpdated: " +
                          i.updated +
                          "\n" +
                          i.title +
                          "\n\n" +
                          i.text
                        ).slice(0, 40000),
                      })),
                    );
                    setIssues([]);
                  })
                }
              >
                Import these snapshots
              </button>
            )}
            <p className={w.small}>
              Imported snapshots are editable context. Refresh by importing the
              same issue keys again.
            </p>
          </section>
          <section className={w.card}>
            <span className={w.kicker}>02 / CONTROLLED HANDOFF</span>
            <h3>Publish reviewed work</h3>
            <p className={w.small}>
              One item at a time. Review its exact title and description.
              Existing linked issues are checked for changes before update.
            </p>
            <button
              disabled={disabled || !cloudId}
              onClick={() =>
                task(async () => {
                  const d = await action("projects");
                  setProjects(d.projects);
                  if (d.truncated)
                    setMessage(
                      "Showing the first 100 accessible Jira projects.",
                    );
                })
              }
            >
              Load projects
            </button>
            <label className={w.field}>
              Destination project
              <select
                disabled={disabled}
                value={projectKey}
                onChange={(e) => {
                  setProjectKey(e.target.value);
                  setTypes([]);
                  setIssueType("");
                  setPreview(null);
                }}
              >
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.key}>
                    {p.key} · {p.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={disabled || !projectKey}
              onClick={() =>
                task(async () => setTypes((await action("types")).types))
              }
            >
              Load issue types
            </button>
            <label className={w.field}>
              Issue type
              <select
                disabled={disabled}
                value={issueType}
                onChange={(e) => {
                  setIssueType(e.target.value);
                  setPreview(null);
                }}
              >
                <option value="">Select a type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={w.field}>
              Story or test
              <select
                disabled={disabled}
                value={itemKey}
                onChange={(e) => {
                  setItemKey(e.target.value);
                  setPreview(null);
                }}
              >
                <option value="">Choose a reviewed item</option>
                {candidates.map((c) => (
                  <option
                    key={c.nodeId + ":" + c.item.id}
                    value={c.nodeId + ":" + c.item.id}
                    disabled={!c.eligible}
                  >
                    {c.item.id} · {c.item.title}{" "}
                    {!c.eligible ? "(review needed)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={disabled || !issueType || !selected?.eligible}
              onClick={() =>
                task(async () => {
                  const node = project.nodes.find(
                    (n) => n.id === selected.nodeId,
                  );
                  if (approvalProblems(project, node).length)
                    throw Error("Resolve document review blockers first.");
                  setPreview({
                    ...(await action("prepare", {
                      projectId: project.id,
                      nodeId: selected.nodeId,
                      itemId: selected.item.id,
                      summary: selected.item.title,
                      description: jiraDescription(
                        selected.item,
                        project.name,
                        project.designLinks || [],
                      ),
                    })),
                    localFingerprint: JSON.stringify(selected.item),
                    nodeId: selected.nodeId,
                    itemId: selected.item.id,
                  });
                })
              }
            >
              Preview Jira change
            </button>
            {preview && (
              <div className={w.publish}>
                <span className={w.tag}>
                  {preview.preview.mode === "create"
                    ? "Create new issue"
                    : "Update " + preview.preview.key}
                </span>
                <p className={w.small}>
                  Destination: {preview.preview.projectKey} · Issue type ID:{" "}
                  {preview.preview.issueType}
                </p>
                <h4>{preview.preview.summary}</h4>
                <pre>{preview.preview.description}</pre>
                {preview.preview.previous && (
                  <details>
                    <summary>Current Jira content being replaced</summary>
                    <strong>{preview.preview.previous.summary}</strong>
                    <pre>{preview.preview.previous.description}</pre>
                  </details>
                )}
                <button
                  disabled={disabled || !selected?.eligible}
                  onClick={() =>
                    task(async () => {
                      if (
                        !selected ||
                        approvalProblems(
                          project,
                          project.nodes.find((n) => n.id === selected.nodeId),
                        ).length ||
                        JSON.stringify(selected.item) !==
                          preview.localFingerprint
                      )
                        throw Error(
                          "This document changed. Preview again before publishing.",
                        );
                      const result = await action("publish", {
                        plan: preview.plan,
                        proof: preview.proof,
                      });
                      change((p) =>
                        record(
                          {
                            ...p,
                            deliveries: [
                              {
                                id: uid(),
                                nodeId: preview.nodeId,
                                itemId: preview.itemId,
                                key: result.key,
                                url: result.url,
                                at: new Date().toISOString(),
                              },
                              ...(p.deliveries || []),
                            ].slice(0, 100),
                          },
                          `Published ${result.key} to Jira.`,
                        ),
                      );
                      setPreview(null);
                      setMessage(
                        result.reconciled
                          ? "Found the existing issue " +
                              result.key +
                              ". Inspect Jira before retrying any uncertain write."
                          : "Saved " + result.key + " in Jira.",
                      );
                    })
                  }
                >
                  {preview.preview.mode === "create"
                    ? "Confirm & create Jira issue"
                    : "Confirm & update Jira issue"}
                </button>
              </div>
            )}
            {(project.deliveries || []).map((d) => (
              <p key={d.id}>
                <a href={d.url} target="_blank" rel="noreferrer">
                  {d.key} ↗
                </a>{" "}
                · {d.itemId} · {new Date(d.at).toLocaleDateString()}
              </p>
            ))}
            <p className={w.small}>
              Custom mandatory fields and sub-tasks need Jira directly. If a
              request times out, inspect Jira before retrying to avoid creating
              duplicate issues.
            </p>
          </section>
        </div>
      )}
      {provider === "figma" && (
        <section className={w.card}>
          <span className={w.kicker}>DESIGN CONTEXT</span>
          <h3>Connect designs to requirements</h3>
          <p className={w.small}>
            Import frame names and text from a file or selected frame. Map
            relevant frames to requirements and add selected text as AI context.
            No images or Figma files are modified.
          </p>
          <label className={w.field}>
            Figma file or frame URL
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.figma.com/design/…"
              maxLength={1000}
            />
          </label>
          <button
            disabled={disabled || !connections.figma?.connected || !url.trim()}
            onClick={() =>
              task(async () => {
                setDesign(await action("import", { url }));
                setMapping({});
              })
            }
          >
            Read Figma frames
          </button>
          {design && (
            <>
              <h3>{design.name}</h3>
              <p className={w.small}>
                File version: {design.version} · {design.frames.length}{" "}
                top-level frames loaded
              </p>
              {design.frames.map((f) => (
                <article className={w.queueItem} key={f.id}>
                  <div>
                    <small>
                      {f.page} · {Math.round(f.width)} × {Math.round(f.height)}
                    </small>
                    <h3>
                      <a href={f.url} target="_blank" rel="noreferrer">
                        {f.name} ↗
                      </a>
                    </h3>
                    <p>
                      {f.text.slice(0, 250) || "No text found in this frame."}
                    </p>
                  </div>
                  <select
                    disabled={disabled}
                    aria-label={"Requirement for " + f.name}
                    value={mapping[f.id] || ""}
                    onChange={(e) =>
                      setMapping({ ...mapping, [f.id]: e.target.value })
                    }
                  >
                    <option value="">Do not import</option>
                    <option value="context">Context only</option>
                    {reqs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.id} · {r.title}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
              <button
                disabled={disabled || !Object.values(mapping).some(Boolean)}
                onClick={() =>
                  task(async () => {
                    const frames = design.frames.filter((f) => mapping[f.id]);
                    addSources([
                      {
                        id: "FIGMA-" + uid().slice(0, 8),
                        name: design.name + " · selected Figma frames",
                        kind: "context",
                        text: frames
                          .map(
                            (f) =>
                              `${f.name}\n${f.url}\nRequirement: ${mapping[f.id]}\n${f.text}`,
                          )
                          .join("\n\n")
                          .slice(0, 40000),
                      },
                    ]);
                    change((p) => ({
                      ...p,
                      designLinks: [
                        ...(p.designLinks || []).filter(
                          (l) => !frames.some((f) => f.url === l.url),
                        ),
                        ...frames
                          .filter((f) => mapping[f.id] !== "context")
                          .map((f) => ({
                            requirementId: mapping[f.id],
                            url: f.url,
                            name: f.name,
                            version: design.version,
                            at: new Date().toISOString(),
                          })),
                      ],
                    }));
                    setDesign(null);
                  })
                }
              >
                Import selected design context
              </button>
            </>
          )}
          {(project.designLinks || []).map((l, i) => (
            <p key={i}>
              <span className={w.tag}>{l.requirementId}</span>{" "}
              <a href={l.url} target="_blank" rel="noreferrer">
                {l.name} ↗
              </a>
            </p>
          ))}
        </section>
      )}
    </div>
  );
}

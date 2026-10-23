"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { prototypeHtml, screenSvg } from "@/lib/studio/prototypeRuntime";
import { download } from "@/lib/studio/downloads";
import { record, uid, invalidate } from "@/lib/studio/model";
import w from "./workbench.module.css";
export default function PrototypeWorkbench({
  project,
  change,
  run,
  add,
  busy,
  configured,
}) {
  const nodes = project.nodes.filter((n) => n.type === "prototype"),
    [chosen, setChosen] = useState("");
  const node = nodes.find((n) => n.id === chosen) || nodes[0];
  if (!node?.artifact?.prototype)
    return (
      <div className={w.empty}>
        <span className={w.kicker}>EXPERIENCE LAB</span>
        <h2>{busy === node?.id ? "Creating your prototype…" : "Make the requirements tangible."}</h2>
        <p>
          Generate a working journey with navigation, form validation and
          simulated data. Review the happy path and failure states before
          engineering starts.
        </p>
        <div className={w.journey}>
          <span>Requirements</span>
          <b>→</b>
          <span>Working screens</span>
          <b>→</b>
          <span>Review evidence</span>
        </div>
        <button
          disabled={busy || configured === false}
          onClick={() => (node ? run([node.id]) : add("prototype"))}
        >
          {busy === node?.id ? "Creating…" : node ? "Generate prototype" : "Add prototype to workflow"} ↗
        </button>
        <small>
          External services are simulated. Your prototype is a review tool, not
          a production application.
        </small>
      </div>
    );
  return (
    <Prototype
      key={node.id + node.artifact.generatedAt}
      {...{ project, change, run, busy, node, nodes, chosen, setChosen }}
    />
  );
}
function Prototype({
  project,
  change,
  run,
  busy,
  node,
  nodes,
  chosen,
  setChosen,
}) {
  const spec = node.artifact.prototype,
    iframe = useRef(null),
    [screen, setScreen] = useState(spec.startScreenId),
    [start, setStart] = useState(spec.startScreenId),
    [device, setDevice] = useState("desktop"),
    [failure, setFailure] = useState(false),
    [reset, setReset] = useState(0),
    [panel, setPanel] = useState("scenarios"),
    [feedback, setFeedback] = useState(""),
    [instruction, setInstruction] = useState(node.instruction || ""),
    [reviewer, setReviewer] = useState("");
  const html = useMemo(
    () => prototypeHtml(spec, { screenId: start }),
    [spec, start],
  );
  useEffect(() => {
    const receive = (e) => {
      if (
        e.source === iframe.current?.contentWindow &&
        e.data?.type === "stockedby-prototype-screen" &&
        spec.screens.some((s) => s.id === e.data.screenId)
      )
        setScreen(e.data.screenId);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [spec]);
  const current = spec.screens.find((s) => s.id === screen) || spec.screens[0];
  function result(scenario, status) {
    change((p) =>
      record(
        {
          ...p,
          prototypeResults: [
            {
              id: uid(),
              nodeId: node.id,
              version: node.artifact.generatedAt,
              scenarioId: scenario.id,
              status,
              reviewer: reviewer.trim(),
              at: new Date().toISOString(),
            },
            ...(p.prototypeResults || []),
          ].slice(0, 100),
        },
        `Prototype scenario ${scenario.name}: ${status} (manual observation).`,
      ),
    );
  }
  return (
    <div className={w.lab}>
      <div className={w.heading}>
        <div>
          <span className={w.kicker}>EXPERIENCE LAB</span>
          <h2>
            {spec.name}{" "}
            <span className={w.tag}>
              {node.artifact.status === "stale"
                ? "Needs regeneration"
                : "Interactive prototype"}
            </span>
          </h2>
          <p>
            Use the product. Challenge the specification. Capture the decisions.
          </p>
        </div>
        <div className={w.actions}>
          <button
            onClick={() =>
              download(
                new Blob([prototypeHtml(spec)], { type: "text/html" }),
                spec.name + ".html",
              )
            }
          >
            Download HTML ↗
          </button>
          <button
            onClick={() =>
              download(
                new Blob([screenSvg(spec, screen)], { type: "image/svg+xml" }),
                current.name + ".svg",
              )
            }
          >
            Screen SVG
          </button>
        </div>
      </div>
      {node.artifact.status === "stale" && (
        <div className={w.warning}>
          Context has changed. This prototype and its recorded observations need
          another review.
        </div>
      )}
      <div className={w.labGrid}>
        <section className={w.preview}>
          <div className={w.toolbar}>
            <span className={w.dots}>● ● ●</span>
            <span className={w.address}>prototype / {current.id}</span>
            <div className={w.segment}>
              <button
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                Desktop
              </button>
              <button
                aria-pressed={device === "mobile"}
                onClick={() => setDevice("mobile")}
              >
                Mobile
              </button>
            </div>
            <button
              title="Reset simulated data"
              onClick={() => setReset((r) => r + 1)}
            >
              ↻ Reset
            </button>
          </div>
          <div className={w.stage}>
            <iframe
              ref={iframe}
              key={reset}
              title={spec.name + " interactive prototype"}
              sandbox="allow-scripts"
              srcDoc={html}
              onLoad={() => iframe.current?.contentWindow?.postMessage({ type: "stockedby-prototype-failure", enabled: failure }, "*")}
              style={{ maxWidth: device === "mobile" ? 390 : "100%" }}
            />
          </div>
          <div className={w.screenStrip}>
            {spec.screens.map((s, i) => (
              <button
                key={s.id}
                aria-pressed={screen === s.id}
                onClick={() => {
                  setStart(s.id);
                  setReset((r) => r + 1);
                }}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {s.name}
              </button>
            ))}
          </div>
          <div className={w.previewFoot}>
            <span>Isolated simulation · changes reset with the preview</span>
            <label>
              <input
                type="checkbox"
                checked={failure}
                onChange={(e) => { setFailure(e.target.checked); iframe.current?.contentWindow?.postMessage({ type: "stockedby-prototype-failure", enabled: e.target.checked }, "*"); }}
              />{" "}
              Simulate submission failure
            </label>
          </div>
        </section>
        <aside className={w.inspector}>
          <details className={w.prototypeScope}><summary>What this prototype covers</summary><p>{spec.description}</p><p>All data and permissions are simulated. Complex business rules need implementation and testing before release.</p></details>
          {nodes.length > 1 && (
            <label>
              Prototype
              <select
                value={chosen || node.id}
                onChange={(e) => setChosen(e.target.value)}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.artifact?.title || "Untitled prototype"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className={w.inspectorHeader}>
            <span className={w.kicker}>REVIEW THIS EXPERIENCE</span>
            <h3>{current.name}</h3>
            <div className={w.chips}>
              {current.requirementIds.map((id) => (
                <span key={id}>{id}</span>
              ))}
            </div>
          </div>
          <div className={w.segment}>
            {["scenarios", "feedback", "refine"].map((t) => (
              <button
                key={t}
                aria-pressed={panel === t}
                onClick={() => setPanel(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          {panel === "scenarios" && (
            <>
              <label className={w.field}>
                Reviewer name
                <input
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="For your local review record"
                  maxLength={100}
                />
              </label>
              <p className={w.small}>
                Record what you observed. These are manual checks of this
                simulation.
              </p>
              {spec.scenarios.map((t) => {
                const observation = (project.prototypeResults || []).find(
                  (r) =>
                    r.nodeId === node.id &&
                    r.scenarioId === t.id &&
                    r.version === node.artifact.generatedAt,
                );
                return (
                  <div className={w.scenario} key={t.id}>
                    <div className={w.row}>
                      <b>{t.name}</b>
                      {observation && (
                        <span className={w.tag}>
                          {observation.status}
                          {node.artifact.status === "stale"
                            ? " · outdated"
                            : ""}
                        </span>
                      )}
                    </div>
                    <ol>
                      {t.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <p>
                      <strong>Expected:</strong> {t.expectedResult}
                    </p>
                    <button
                      className={w.textButton}
                      onClick={() => {
                        setStart(t.startScreenId);
                        setReset((r) => r + 1);
                      }}
                    >
                      Start this scenario →
                    </button>
                    <div className={w.actions}>
                      {["passed", "failed"].map((status) => (
                        <button
                          key={status}
                          disabled={
                            !reviewer.trim() ||
                            busy ||
                            node.artifact.status === "stale"
                          }
                          onClick={() => result(t, status)}
                        >
                          {status === "passed" ? "Pass" : "Fail"}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
          {panel === "feedback" && (
            <>
              <p className={w.small}>
                Capture an observation against this screen. It will appear in
                the review queue.
              </p>
              <label className={w.field}>
                What needs attention?
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  maxLength={2000}
                  placeholder="The error state needs a retry action…"
                  rows={5}
                />
              </label>
              <button
                disabled={!feedback.trim() || busy}
                onClick={() => {
                  change((p) =>
                    record(
                      {
                        ...p,
                        prototypeFeedback: [
                          {
                            id: uid(),
                            nodeId: node.id,
                            screenId: screen,
                            requirementIds: current.requirementIds,
                            note: feedback.trim(),
                            at: new Date().toISOString(),
                            resolved: false,
                          },
                          ...(p.prototypeFeedback || []),
                        ].slice(0, 100),
                      },
                      "Prototype feedback captured.",
                    ),
                  );
                  setFeedback("");
                }}
              >
                Add to review queue
              </button>
              {(project.prototypeFeedback || [])
                .filter((f) => f.screenId === screen && f.nodeId === node.id)
                .map((f) => (
                  <div className={w.scenario} key={f.id}>
                    {f.note}
                    <small>
                      {f.resolved ? "Resolved locally" : "Open observation"}
                    </small>
                  </div>
                ))}
            </>
          )}
          {panel === "refine" && (
            <>
              <p className={w.small}>
                Describe the change. AI will use current upstream requirements
                and accepted decisions. A previous version is saved
                automatically.
              </p>
              <label className={w.field}>
                Refinement instructions
                <textarea
                  rows={6}
                  maxLength={2000}
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="Add an empty state and a clearer confirmation step."
                />
              </label>
              <button
                disabled={busy}
                onClick={() => {
                  change((p) =>
                    invalidate(
                      {
                        ...p,
                        nodes: p.nodes.map((n) =>
                          n.id === node.id ? { ...n, instruction } : n,
                        ),
                      },
                      p.nodes.findIndex((n) => n.id === node.id),
                    ),
                  );
                  run([node.id]);
                }}
              >
                Regenerate prototype ↗
              </button>
              <p className={w.small}>
                SVG export contains editable screen elements for importing into
                Figma. It does not publish to a Figma file.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

import { uid, record, invalidate, traceRows } from "./model.js";
export function checkpoint(p, nodeId, label = "Saved version") {
  const node = p.nodes.find((n) => n.id === nodeId);
  if (!node?.artifact) return p;
  const versions = [
    {
      id: uid(),
      nodeId,
      at: new Date().toISOString(),
      label,
      artifact: structuredClone(node.artifact),
    },
    ...(p.versions || []),
  ].slice(0, 12);
  return { ...p, versions };
}
export function restoreVersion(p, versionId) {
  const v = (p.versions || []).find((v) => v.id === versionId);
  if (!v || !p.nodes.some((n) => n.id === v.nodeId)) return p;
  const backed = checkpoint(p, v.nodeId, "Before restore");
  return record(
    invalidate(
      {
        ...backed,
        nodes: backed.nodes.map((n) =>
          n.id === v.nodeId
            ? {
                ...n,
                artifact: {
                  ...structuredClone(v.artifact),
                  status: "stale",
                  approval: null,
                },
              }
            : n,
        ),
      },
      backed.nodes.findIndex((n) => n.id === v.nodeId),
    ),
    "A previous version was restored. Reconcile it with current context before review.",
  );
}
export function compareArtifacts(before, after) {
  const b = new Map((before?.items || []).map((i) => [i.id, i])),
    a = new Map((after?.items || []).map((i) => [i.id, i]));
  return {
    narrativeChanged: before?.content !== after?.content,
    added: [...a.values()].filter((i) => !b.has(i.id)),
    removed: [...b.values()].filter((i) => !a.has(i.id)),
    changed: [...a.values()]
      .filter(
        (i) => b.has(i.id) && JSON.stringify(i) !== JSON.stringify(b.get(i.id)),
      )
      .map((i) => ({ before: b.get(i.id), after: i })),
  };
}
export function reviewQueue(p) {
  const out = [];
  for (const n of p.nodes) {
    const a = n.artifact;
    if (!a) continue;
    if (a.status === "stale")
      out.push({
        id: n.id + "-stale",
        nodeId: n.id,
        severity: "blocker",
        category: "Changed context",
        title: a.title,
        detail:
          "The document is based on an earlier context or workflow. Regenerate and compare before review.",
      });
    for (const [i, q] of (a.questions || []).entries())
      out.push({
        id: n.id + "-q" + i,
        nodeId: n.id,
        severity: "decision",
        category: "Open question",
        title: q,
        detail: a.title,
      });
    for (const [i, f] of (a.findings || []).entries())
      out.push({
        id: n.id + "-f" + i,
        nodeId: n.id,
        severity: f.severity,
        category: "AI review finding",
        title: f.issue,
        detail: f.quote || a.title,
      });
    for (const scenario of a.prototype?.scenarios || []) {
      const observation = (p.prototypeResults || []).find(
        (r) =>
          r.nodeId === n.id &&
          r.version === a.generatedAt &&
          r.scenarioId === scenario.id,
      );
      if (observation?.status === "failed")
        out.push({
          id: n.id + "-scenario-" + scenario.id,
          nodeId: n.id,
          severity: "warning",
          category: "Manual prototype check failed",
          title: scenario.name,
          detail: `Recorded by ${observation.reviewer}. Expected: ${scenario.expectedResult}`,
        });
    }
    for (const item of a.items || [])
      if (
        ["requirements", "stories"].includes(n.type) &&
        !item.acceptanceCriteria?.length
      )
        out.push({
          id: n.id + "-ac" + item.id,
          nodeId: n.id,
          severity: "warning",
          category: "Missing acceptance criteria",
          title: item.id + " · " + item.title,
          detail:
            "Define an observable outcome so design, engineering and QA can agree what done means.",
        });
  }
  for (const r of traceRows(p))
    if (!r.links.some((l) => l.type === "tests" && l.status !== "stale"))
      out.push({
        id: r.nodeId + "-coverage" + r.id,
        nodeId: r.nodeId,
        severity: "warning",
        category: "Test coverage gap",
        title: r.id + " · " + r.title,
        detail: "No current test specification links to this requirement.",
      });
  return out;
}
export function saveDecision(
  p,
  { title, decision, owner, requirementIds = [], status = "accepted" },
) {
  if (!["accepted", "deferred"].includes(status))
    throw Error("Choose an accepted or deferred decision.");
  if (!title?.trim() || !decision?.trim())
    throw Error("Add the question and your decision.");
  const d = {
    id: uid(),
    title: title.trim().slice(0, 300),
    decision: decision.trim().slice(0, 4000),
    owner: (owner || "").trim().slice(0, 100),
    requirementIds,
    status,
    at: new Date().toISOString(),
  };
  return record(
    status === "accepted"
      ? invalidate({
          ...p,
          decisions: [d, ...(p.decisions || [])].slice(0, 100),
        })
      : { ...p, decisions: [d, ...(p.decisions || [])].slice(0, 100) },
    `Decision recorded: ${d.title}`,
  );
}
export const WORKFLOW_PRESETS = [
  {
    id: "discovery",
    name: "Validate an idea",
    description:
      "Clarify the problem, try the experience, capture what you learn.",
    types: ["brief", "requirements", "prototype", "review"],
  },
  {
    id: "delivery",
    name: "Prepare for delivery",
    description:
      "A connected specification, prototype, stories and test package.",
    types: [
      "brief",
      "requirements",
      "flow",
      "prototype",
      "stories",
      "tests",
      "review",
      "handoff",
    ],
  },
  {
    id: "policy",
    name: "Policy-led change",
    description: "Business rationale, company rules and evidence for review.",
    types: [
      "businesscase",
      "requirements",
      "flow",
      "screens",
      "prototype",
      "stories",
      "tests",
      "review",
      "handoff",
    ],
  },
];

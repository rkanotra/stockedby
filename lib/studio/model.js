import { planMarkdown, readPlan } from "./product-plan.js";
import { validatePrototype } from "./prototype.js";
export const NODE_TYPES = [
  {
    id: "businesscase",
    label: "Business case",
    short: "Business case",
    icon: "brief",
    color: "orange",
    description:
      "Problem, options, expected value, assumptions and decision criteria. No invented ROI.",
  },
  {
    id: "prototype",
    label: "Working prototype",
    short: "Prototype",
    icon: "screen",
    color: "violet",
    description:
      "Interactive screens, validated forms, simulated data and review scenarios.",
  },
  {
    id: "review",
    label: "Readiness review",
    short: "Review",
    icon: "shield",
    color: "pink",
    description:
      "Review the evidence, policy gaps, unresolved decisions and delivery dependencies.",
  },
  {
    id: "brief",
    label: "Product brief",
    short: "Brief",
    icon: "brief",
    color: "lime",
    description: "The problem, audience, value and measures of success.",
  },
  {
    id: "requirements",
    label: "Requirements",
    short: "Requirements",
    icon: "layers",
    color: "blue",
    description:
      "A PRD or BRD with scope, business rules and acceptance criteria.",
  },
  {
    id: "flow",
    label: "Process flow",
    short: "Flow",
    icon: "flow",
    color: "violet",
    description: "Actors, decisions, happy paths and failure paths.",
  },
  {
    id: "screens",
    label: "Screen specification",
    short: "Screens",
    icon: "screen",
    color: "pink",
    description: "Screen inventory, states, fields and interaction rules.",
  },
  {
    id: "stories",
    label: "User stories",
    short: "Stories",
    icon: "stories",
    color: "orange",
    description: "Buildable stories with explicit acceptance criteria.",
  },
  {
    id: "tests",
    label: "Test plan",
    short: "Tests",
    icon: "check",
    color: "mint",
    description: "Positive, negative and boundary tests with expected results.",
  },
  {
    id: "handoff",
    label: "Delivery handoff",
    short: "Handoff",
    icon: "export",
    color: "blue",
    description: "A delivery summary, open decisions and review checklist.",
  },
];
export const STORAGE_KEY = "stockedby.studio.v1";
export const TYPE = Object.fromEntries(NODE_TYPES.map((n) => [n.id, n]));
export const uid = () => crypto.randomUUID();
export function newProject(name = "Untitled initiative") {
  return {
    id: uid(),
    name,
    brief: "",
    productPlan: readPlan(null),
    sources: [],
    rules: [],
    decisions: [],
    versions: [],
    designLinks: [],
    deliveries: [],
    nodes: [
      "brief",
      "requirements",
      "prototype",
      "stories",
      "tests",
      "review",
    ].map((type) => ({
      id: uid(),
      type,
      instruction: "",
      artifact: null,
    })),
    activity: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
export function record(p, message) {
  return {
    ...p,
    updatedAt: new Date().toISOString(),
    activity: [
      { id: uid(), message, at: new Date().toISOString() },
      ...p.activity,
    ].slice(0, 80),
  };
}
export function invalidate(p, from = 0) {
  return {
    ...p,
    nodes: p.nodes.map((n, i) =>
      i >= from && n.artifact
        ? { ...n, artifact: { ...n.artifact, status: "stale", approval: null } }
        : n,
    ),
  };
}
export function updateContext(p, patch) {
  if (Object.entries(patch).every(([key, value]) => JSON.stringify(p[key]) === JSON.stringify(value))) return p;
  return record(
    invalidate({ ...p, ...patch }),
    "Project context updated. Existing outputs need review.",
  );
}
export function updateArtifact(p, nodeId, artifact, { manual = false } = {}) {
  const idx = p.nodes.findIndex((n) => n.id === nodeId);
  if (idx < 0) return p;
  const previous = p.nodes[idx].artifact;
  const versions =
    previous && !manual
      ? [
          {
            id: uid(),
            nodeId,
            at: new Date().toISOString(),
            label: "Before regeneration",
            artifact: structuredClone(previous),
          },
          ...(p.versions || []),
        ].slice(0, 12)
      : p.versions || [];
  const material = a => a ? JSON.stringify([a.title, a.summary, a.content, a.items, a.questions, a.findings, a.prototype]) : null;
  if (material(previous) === material(artifact)) return p;
  const changed = invalidate({ ...p, versions }, idx + 1);
  changed.nodes = changed.nodes.map((n) =>
    n.id === nodeId
      ? {
          ...n,
          artifact: {
            ...artifact,
            status:
              manual && n.artifact?.status === "stale" ? "stale" : "draft",
            approval: null,
            generatedAt: manual
              ? n.artifact?.generatedAt
              : new Date().toISOString(),
          },
        }
      : n,
  );
  return record(
    changed,
    `${TYPE[p.nodes[idx].type].label} updated; downstream documents need review.`,
  );
}
export function reorder(p, id, beforeId) {
  if (id === beforeId) return p;
  const item = p.nodes.find((n) => n.id === id);
  if (!item) return p;
  const nodes = p.nodes.filter((n) => n.id !== id);
  const idx = nodes.findIndex((n) => n.id === beforeId);
  nodes.splice(idx < 0 ? nodes.length : idx, 0, item);
  return record(
    invalidate({ ...p, nodes }),
    "Workflow reordered. Review existing outputs against the new sequence.",
  );
}
const norm = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim();
export function groundedRule(rule, sources) {
  const source = sources.find(
    (s) => s.id === rule.sourceId && s.kind === "standard",
  );
  return (
    !!source &&
    norm(rule.quote).length >= 8 &&
    norm(source.text).includes(norm(rule.quote))
  );
}
export function traceRows(p) {
  const requirements = p.nodes
    .filter((n) => n.type === "requirements" && n.artifact)
    .flatMap((n) =>
      n.artifact.items.map((item) => ({
        ...item,
        nodeId: n.id,
        status: n.artifact.status,
      })),
    );
  return requirements.map((r) => ({
    ...r,
    links: p.nodes
      .filter((n) => n.type !== "requirements" && n.artifact)
      .flatMap((n) =>
        n.artifact.items
          .filter((i) => i.requirementIds.includes(r.id))
          .map((i) => ({
            id: i.id,
            title: i.title,
            type: n.type,
            nodeId: n.id,
            status: n.artifact.status,
          })),
      ),
  }));
}
export function approvalProblems(p, node) {
  if (!node?.artifact) return ["Generate a document first."];
  const problems = [];
  if (node.artifact.status === "stale")
    problems.push("Regenerate this document using the updated context.");
  if (node.artifact.questions.length)
    problems.push("Resolve the open questions in context, then regenerate.");
  if (node.artifact.findings.some((f) => f.severity === "blocker"))
    problems.push("Resolve blocking findings and regenerate.");
  if (
    p.sources.some((s) => s.kind === "standard") &&
    !p.rules.some((r) => r.approved && groundedRule(r, p.sources))
  )
    problems.push("Extract and confirm the applicable standards first.");
  return problems;
}
export function parseProjectFile(raw) {
  const data = JSON.parse(raw);
  if (data.format !== "stockedby-studio" || data.version !== 1)
    throw new Error("Choose a StockedBy Studio project backup (.json).");
  const p = data.project;
  if (
    !p ||
    typeof p.name !== "string" ||
    typeof p.brief !== "string" ||
    !Array.isArray(p.nodes) ||
    p.nodes.length > 12 ||
    !Array.isArray(p.sources) ||
    p.sources.length > 20 ||
    !Array.isArray(p.rules)
  )
    throw new Error("This project backup is incomplete.");
  if (raw.length > 2500000) throw new Error("Project backup exceeds 2.5 MB.");
  const strings = (a) =>
    Array.isArray(a) && a.every((x) => typeof x === "string");
  const ids = new Set();
  p.nodes.forEach((n) => {
    if (
      !TYPE[n.type] ||
      typeof n.id !== "string" ||
      ids.has(n.id) ||
      typeof n.instruction !== "string"
    )
      throw new Error("Invalid workflow node.");
    ids.add(n.id);
    if (n.artifact?.prototype) validatePrototype(n.artifact.prototype);
    const a = n.artifact;
    if (
      a &&
      (typeof a.content !== "string" ||
        typeof a.title !== "string" ||
        typeof a.summary !== "string" ||
        !strings(a.questions) ||
        !Array.isArray(a.findings) ||
        !a.findings.every(
          (f) =>
            f &&
            typeof f.issue === "string" &&
            ["blocker", "warning", "note"].includes(f.severity),
        ) ||
        !Array.isArray(a.items) ||
        !a.items.every(
          (i) =>
            i &&
            typeof i.id === "string" &&
            typeof i.title === "string" &&
            typeof i.detail === "string" &&
            strings(i.sourceIds) &&
            strings(i.requirementIds) &&
            strings(i.acceptanceCriteria),
        ))
    )
      throw new Error("Invalid document in project backup.");
  });
  const sourceIds = new Set();
  if (
    p.sources.some(
      (s) =>
        !s ||
        typeof s.id !== "string" ||
        sourceIds.has(s.id) ||
        !sourceIds.add(s.id) ||
        !["context", "standard"].includes(s.kind) ||
        typeof s.text !== "string" ||
        typeof s.name !== "string" ||
        s.text.length > 40000,
    )
  )
    throw new Error("Invalid source document.");
  if (
    p.rules.some(
      (r) =>
        !r ||
        typeof r.id !== "string" ||
        typeof r.title !== "string" ||
        typeof r.detail !== "string" ||
        typeof r.sourceId !== "string" ||
        typeof r.quote !== "string",
    )
  )
    throw new Error("Invalid standards in project backup.");
  // Imported review assertions are not authenticated approvals in this browser.
  return {
    ...p,
    productPlan: { ...readPlan(p.productPlan), sections: Object.fromEntries(Object.entries(readPlan(p.productPlan).sections).map(([id, s]) => [id, { ...s, reviewed: null }])) },
    planProposal: null,
    planHistory: [],
    id: uid(),
    versions: [],
    prototypeResults: [],
    prototypeFeedback: [],
    deliveries: [],
    designLinks: [],
    decisions: Array.isArray(p.decisions)
      ? p.decisions
          .filter(
            (d) =>
              d &&
              typeof d.title === "string" &&
              typeof d.decision === "string",
          )
          .slice(0, 100)
          .map((d) => ({
            id: uid(),
            title: d.title.slice(0, 300),
            decision: d.decision.slice(0, 4000),
            at: new Date().toISOString(),
            owner: typeof d.owner === "string" ? d.owner : "",
            status: "deferred",
            requirementIds: [],
          }))
      : [],
    rules: p.rules.map((r) => ({ ...r, approved: false })),
    nodes: p.nodes.map((n) => ({
      ...n,
      artifact: n.artifact
        ? { ...n.artifact, status: "stale", approval: null }
        : null,
    })),
    activity: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
export function projectMarkdown(p) {
  return (
    `# ${p.name}\n\nExported from StockedBy · ${new Date().toLocaleDateString("en-GB")}\n\nLocal review records are not verified team signatures.\n\n## Project context\n\n${p.brief}\n\n` +
    planMarkdown(p) +
    ((p.decisions || []).length
      ? "## Decision log\n\n" +
        (p.decisions || [])
          .map(
            (d) =>
              `### ${d.title}\n${d.decision}\nOwner: ${d.owner || "Unassigned"} · ${d.status}`,
          )
          .join("\n\n") +
        "\n\n"
      : "") +
    p.nodes
      .filter((n) => n.artifact)
      .map((n) => {
        const a = n.artifact;
        return (
          `# ${a.title}\n\nStatus: ${a.status}${a.approval ? ` · Reviewed locally by ${a.approval.by}` : ""}\n\n${a.content}\n\n` +
          a.items
            .map(
              (i) =>
                `## ${i.id} — ${i.title}\n\n${i.detail}\n\n${i.acceptanceCriteria.map((c) => "- " + c).join("\n")}\n\nSources: ${i.sourceIds.join(", ") || "Unlinked"} · Requirements: ${i.requirementIds.join(", ") || "Unlinked"}`,
            )
            .join("\n\n") +
          `\n\n## Open questions\n${a.questions.map((q) => "- " + q).join("\n") || "None recorded"}\n\n## Review findings\n${a.findings.map((f) => `- [${f.severity}] ${f.issue}`).join("\n") || "None reported; this is not a compliance certification."}`
        );
      })
      .join("\n\n---\n\n")
  );
}
export function csv(p) {
  const cell = (x) =>
    '"' +
    String(x ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  return [
    [
      "Type",
      "ID",
      "Summary",
      "Description",
      "Acceptance criteria",
      "Requirement links",
      "Source links",
      "Status",
    ],
    ...p.nodes
      .filter((n) => n.artifact)
      .flatMap((n) =>
        n.artifact.items.map((i) => [
          TYPE[n.type].label,
          i.id,
          i.title,
          i.detail,
          i.acceptanceCriteria.join("\n"),
          i.requirementIds.join(", "),
          i.sourceIds.join(", "),
          n.artifact.status,
        ]),
      ),
  ]
    .map((r) => r.map(cell).join(","))
    .join("\r\n");
}

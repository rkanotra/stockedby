// Prefer an existing PRD on return; otherwise surface the latest actual output.
// Empty workflow placeholders must never hide a document that was generated.
export function initialDocument(project) {
  return project.nodes.find(node => node.type === "requirements" && node.artifact)
    || [...project.nodes].filter(node => node.artifact).sort((a, b) =>
      (b.artifact.generatedAt || "").localeCompare(a.artifact.generatedAt || ""))[0]
    || null;
}
export function documentView(node) {
  return node?.type === "prototype" ? "prototype" : "documents";
}

// An explicit continuation uses the chosen PRD even when it has open queries or
// unapplied answers. Its draft status and uncertainties travel with the content.
export function generationUpstream(project, targetId, sourceNodeId = null) {
  const index = project.nodes.findIndex(n => n.id === targetId);
  sourceNodeId ||= project.nodes[index]?.sourceNodeId;
  return project.nodes.filter((n, i) => n.id !== targetId && n.artifact &&
    ((i < index && n.artifact.status !== "stale") || n.id === sourceNodeId))
    .map(n => ({ type: n.type, ...n.artifact }));
}

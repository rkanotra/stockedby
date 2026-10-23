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

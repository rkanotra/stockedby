export function figmaReference(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw Error("Paste a Figma design or file URL.");
  }
  if (
    u.protocol !== "https:" ||
    !["www.figma.com", "figma.com"].includes(u.hostname) ||
    u.username ||
    u.password
  )
    throw Error("Use a https://www.figma.com file URL.");
  const parts = u.pathname.split("/").filter(Boolean);
  if (
    !["design", "file", "proto"].includes(parts[0]) ||
    !/^\w{8,100}$/.test(parts[1] || "")
  )
    throw Error("Choose a specific Figma file.");
  const node = u.searchParams.get("node-id")?.replace(/-/g, ":") || "";
  if (node && !/^\d+:\d+$/.test(node))
    throw Error("Invalid Figma node identifier.");
  return { key: parts[1], node };
}
export function adfText(doc) {
  if (!doc) return "";
  if (typeof doc === "string") return doc.slice(0, 40000);
  let out = "";
  function walk(n, depth = 0) {
    if (!n || depth > 30) return;
    if (n.type === "text") out += typeof n.text === "string" ? n.text : "";
    if (n.type === "hardBreak") out += "\n";
    for (const c of Array.isArray(n.content) ? n.content : [])
      walk(c, depth + 1);
    if (["paragraph", "heading", "listItem"].includes(n.type)) out += "\n";
  }
  walk(doc);
  return out.trim().slice(0, 40000);
}
export function toAdf(text) {
  return {
    version: 1,
    type: "doc",
    content: String(text)
      .split("\n")
      .map((line) => ({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      })),
  };
}
export function jiraMarker(projectId, nodeId, itemId) {
  return ("sb-" + projectId + "-" + nodeId + "-" + itemId)
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 200);
}
export function jiraDescription(item, projectName, designLinks = []) {
  return [
    `StockedBy · ${projectName}`,
    item.id + " — " + item.title,
    item.detail,
    "Acceptance criteria",
    ...(item.acceptanceCriteria || []).map((c) => "• " + c),
    "Requirement references: " + (item.requirementIds || []).join(", "),
    "Source references: " + (item.sourceIds || []).join(", "),
    ...designLinks
      .filter((l) => (item.requirementIds || []).includes(l.requirementId))
      .map((l) => "Design: " + l.url),
  ].join("\n\n");
}
export function figmaFrames(data, key) {
  const frames = [];
  let count = 0;
  function walk(n, page = "", depth = 0) {
    if (!n || depth > 15 || count++ > 15000) return;
    if (n.type === "CANVAS") page = n.name;
    if (
      ["FRAME", "COMPONENT", "COMPONENT_SET"].includes(n.type) &&
      frames.length < 100
    ) {
      const texts = [];
      function read(x, d = 0) {
        if (!x || d > 12 || texts.join("").length > 3500) return;
        if (typeof x.characters === "string") texts.push(x.characters);
        for (const c of x.children || []) read(c, d + 1);
      }
      read(n);
      frames.push({
        id: n.id,
        name: n.name,
        page,
        text: texts.join("\n").slice(0, 3500),
        url: `https://www.figma.com/design/${key}?node-id=${encodeURIComponent(n.id)}`,
        width: n.absoluteBoundingBox?.width || 0,
        height: n.absoluteBoundingBox?.height || 0,
      });
      return;
    }
    for (const c of n.children || []) walk(c, page, depth + 1);
  }
  if (data.document) walk(data.document);
  else for (const n of Object.values(data.nodes || {})) walk(n.document);
  return frames;
}
export function exportCandidates(p) {
  return p.nodes
    .filter((n) => ["stories", "tests"].includes(n.type) && n.artifact)
    .flatMap((n) =>
      n.artifact.items.map((item) => ({
        nodeId: n.id,
        type: n.type,
        item,
        status: n.artifact.status,
        eligible:
          n.artifact.status === "approved" &&
          !n.artifact.questions.length &&
          !n.artifact.findings.some((f) => f.severity === "blocker"),
      })),
    );
}

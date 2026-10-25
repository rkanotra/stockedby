// Personal journeys start with no applications. Read-only catalogues (rooms,
// products, etc.) remain available; collections written by forms are personal.
// Strip their examples before embedding the spec in a preview or download.
export function preparePrototypeData(spec) {
  const data = structuredClone(spec);
  data.dataScope = spec.dataScope || "personal";
  const personal = new Set();
  if (data.dataScope === "personal") {
    for (const screen of data.screens) for (const section of screen.sections) {
      if (section.type === "form" && section.collection) personal.add(section.collection);
      for (const action of section.actions) {
        if (["submit", "continue"].includes(action.kind) && action.collection) personal.add(action.collection);
      }
    }
  }
  data.personalCollections = [...personal];
  for (const screen of data.screens) for (const section of screen.sections) {
    if (personal.has(section.collection) && section.type !== "summary") section.records = [];
    // Correct the exact disclosure emitted by the previous generator without
    // changing adjacent source-specific limitations or policy text.
    if (data.dataScope === "personal") section.description = section.description.replace(
      "All application records are visible to all users in this demo (no filtering or user-specific view).",
      "Only the application entered in this preview is shown."
    );
  }
  return data;
}

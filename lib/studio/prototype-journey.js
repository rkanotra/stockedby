// Read the actual navigation graph. Array position is not a guaranteed next step.
export function prototypeJourney(spec) {
  const screens = spec.screens.map(screen => ({
    id: screen.id, name: screen.name, form: screen.sections.some(s => s.type === 'form'),
    edges: [...screen.actions, ...screen.sections.flatMap(s => s.actions)]
      .filter(a => a.targetScreenId && spec.screens.some(s => s.id === a.targetScreenId))
      .map(a => ({ label: a.label, target: a.targetScreenId, targetName: spec.screens.find(s => s.id === a.targetScreenId).name })),
  }));
  const reached = new Set(), queue = [spec.startScreenId];
  while(queue.length) { const id = queue.shift(); if (reached.has(id)) continue; reached.add(id); queue.push(...(screens.find(s => s.id === id)?.edges || []).map(e => e.target)); }
  return screens.map(s => ({ ...s, reachable: reached.has(s.id) }));
}

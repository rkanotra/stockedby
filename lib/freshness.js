// Shared (client + server safe) snapshot-staleness helper: a category+engine
// with no snapshot newer than SNAPSHOT_MAX_AGE_DAYS is what triggers the
// on-demand harvest in app/api/test/route.js (lib/harvestClients.js) instead
// of showing "data coming soon". Also imported client-side — via the
// already-bundled data/*.json in lib/bankStatic.js — so components/test/
// TestFlow.js can compute the same "which engines will be harvested live"
// answer before the request fires, to drive RunningPanel's copy. No fs, no
// API keys: safe in both environments.
export const SNAPSHOT_MAX_AGE_DAYS = 30;

export function latestSnapshotFor(category, engine) {
  const snaps = (category?.snapshots || []).filter((s) => s.engine === engine);
  return snaps.sort((a, b) => (a.collected_on < b.collected_on ? 1 : -1))[0] || null;
}

export function isStale(collectedOn, referenceDate = new Date()) {
  if (!collectedOn) return true;
  const then = new Date(`${collectedOn}T00:00:00Z`).getTime();
  if (Number.isNaN(then)) return true;
  const days = (referenceDate.getTime() - then) / 86_400_000;
  return days > SNAPSHOT_MAX_AGE_DAYS;
}

// Which of `engines` lack a snapshot for this category newer than
// SNAPSHOT_MAX_AGE_DAYS (or have none at all).
export function staleEnginesFor(category, engines, referenceDate = new Date()) {
  return engines.filter((e) => {
    const latest = latestSnapshotFor(category, e);
    return !latest || isStale(latest.collected_on, referenceDate);
  });
}

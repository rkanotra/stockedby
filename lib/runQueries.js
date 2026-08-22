// Client-side orchestration for the live per-question Claude calls —
// each question runs as its own request against app/api/test/query,
// instead of one /api/test invocation running all of them internally
// (see that route's own comment for why: no single Vercel function should
// own more than one question's worth of duration risk).

const CLIENT_RETRY_WAIT_MS = 1_500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callQueryEndpoint(text, archetype) {
  const res = await fetch("/api/test/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, archetype }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.status !== "done") {
    throw new Error(data?.error || "Live test failed for this question.");
  }
  return data;
}

// One question: try once, and on any failure (network error, or the
// endpoint's own one-retry-then-error result) wait briefly and try again
// exactly once more — a fresh, separate request each time, so neither
// attempt shares its duration budget with any other question's. Never
// throws — always resolves to a row matching what app/api/test's
// `liveRuns` expects. onStatus (optional) fires with "done"/"error" the
// moment this question settles, for live per-question UI feedback
// (components/test/RunningPanel.js) instead of one coarse "searching"
// state for the whole batch.
export async function runOneQuery(q, onStatus) {
  const base = { qid: q.qid, text: q.text, archetype: q.archetype };
  try {
    const data = await callQueryEndpoint(q.text, q.archetype);
    onStatus?.(q.qid, "done");
    return { ...base, status: "done", recs: data.recs, searches: data.searches, citations: data.citations };
  } catch (firstErr) {
    await sleep(CLIENT_RETRY_WAIT_MS);
    try {
      const data = await callQueryEndpoint(q.text, q.archetype);
      onStatus?.(q.qid, "done");
      return { ...base, status: "done", recs: data.recs, searches: data.searches, citations: data.citations };
    } catch (secondErr) {
      onStatus?.(q.qid, "error");
      return {
        ...base,
        status: "error",
        recs: [],
        searches: [],
        citations: [],
        error: secondErr?.message || firstErr?.message || "Live test failed for this question after a retry.",
      };
    }
  }
}

// All questions in parallel — each with its own independent retry above,
// so one slow or failing question never blocks or is blocked by another.
export async function runAllQueries(queries, onStatus) {
  return Promise.all(queries.map((q) => runOneQuery(q, onStatus)));
}

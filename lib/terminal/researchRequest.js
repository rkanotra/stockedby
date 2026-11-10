// A browser can lose the response after the server has saved the report.
// Recover by reading storage; never repeat the paid request automatically.
export async function requestDossier({ api, reload, key, input, previous, now = Date.now(), onRecover = () => {}, pause = () => new Promise(resolve => setTimeout(resolve, 5000)), attempts = 25 }) {
  try {
    const result = await api('/run', input);
    await reload();
    return result;
  } catch (error) {
    if (error.status) throw error;
    onRecover();
    for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt) await pause();
    const state = await reload().catch(() => null);
    const saved = state?.cache?.[key], report = saved?.reports?.[0];
    const matches = saved?.thesis === input.thesis && saved?.horizon === input.horizon;
    const fresh = value => Date.parse(value) >= now - 1000;
    if(input.mode==='reflection') {
      if(saved?.responses?.some(r=>r.reportId===input.reportId && r.answer===input.answer.trim() && fresh(r.savedAt))) return {status:'complete',recovered:true,dossier:saved};
      continue;
    }
    if (matches && (input.mode === 'review'
      ? report?.id && report.id !== previous?.reports?.[0]?.id && report.thesis === input.thesis && report.horizon === input.horizon && fresh(report.createdAt)
      : input.mode === 'thesis' ? fresh(saved.thesisSavedAt) : fresh(saved.evidence?.fetchedAt))) {
      return { status: 'complete', recovered: true, dossier: saved };
    }
    }
    throw Error('The connection was interrupted. Your previous research is saved. Reload and check History or Activity before retrying; the server may still be finishing this review.');
  }
}

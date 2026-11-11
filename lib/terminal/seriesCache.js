// Keep the most recent dated observations. A newer fetch of shorter or older
// data must not displace a better series. On ties prefer a known return basis.
export function bestSeries(...choices) {
  return choices.filter(s=>s?.bars?.length && s.bars.at(-1)?.date).sort((a,b)=>
    b.bars.at(-1).date.localeCompare(a.bars.at(-1).date) ||
    Number(b.adjustment!=='unknown')-Number(a.adjustment!=='unknown') ||
    b.bars.length-a.bars.length || String(b.fetchedAt||'').localeCompare(String(a.fetchedAt||'')))[0]||null;
}

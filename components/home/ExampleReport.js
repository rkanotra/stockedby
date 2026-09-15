'use client';
import { useRef, useState } from 'react';
import styles from './home.module.css';
export default function ExampleReport({engines,brand}) {
  const [activeId,setActiveId] = useState(engines[0]?.id);
  const refs = useRef({});
  if(!engines.length) return null;
  const active = engines.find(e=>e.id===activeId) || engines[0];
  const count = engines.filter(e=>e.youAppears).length;
  function onKeyDown(event,index) {
    const keys = ['ArrowLeft','ArrowRight','Home','End'];
    if(!keys.includes(event.key)) return;
    event.preventDefault();
    const next = event.key==='Home'?0:event.key==='End'?engines.length-1:(index+(event.key==='ArrowLeft'?-1:1)+engines.length)%engines.length;
    setActiveId(engines[next].id); refs.current[engines[next].id]?.focus();
  }
  return <div className={styles.report}>
    <div className={styles.reportHeader}><div className={styles.reportIdentity}><span className={styles.exampleMonogram} aria-hidden="true">m.</span><div><strong>{brand}</strong><span>Vitamin C serum · India</span></div></div><span className={styles.exampleTag}>Collected example</span></div>
    <div className={styles.reportGrid}>
      <div className={styles.evidence}>
        <div className={styles.tabs} role="tablist" aria-label="Assistant results">{engines.map((engine,index)=><button type="button" key={engine.id} ref={node=>{refs.current[engine.id]=node;}} role="tab" id={`example-tab-${engine.id}`} aria-controls={`example-panel-${engine.id}`} aria-selected={active.id===engine.id} tabIndex={active.id===engine.id?0:-1} onKeyDown={e=>onKeyDown(e,index)} onClick={()=>setActiveId(engine.id)}>{engine.label}</button>)}</div>
        <div className={styles.tabPanel} key={active.id} id={`example-panel-${active.id}`} role="tabpanel" tabIndex={0} aria-labelledby={`example-tab-${active.id}`}>
          <p className={styles.smallLabel}>THE SHOPPER’S QUESTION</p>
          <p className={styles.question}>“{active.query}”</p>
          <div className={styles.rankingHeading}><span>Recommendation</span><span>Buyer sent to</span></div>
          <ol className={styles.rankings}>{active.rows.map(row=><li key={row.rank} className={row.isYou?styles.highlightRow:undefined}><span className={styles.rank}>{String(row.rank).padStart(2,'0')}</span><span className={styles.rankBrand}>{row.brand}{row.isYou&&<span className={styles.brandTag}>Example brand</span>}</span><span className={styles.destination}>{row.destDomain||row.destLabel||'No link given'}</span></li>)}</ol>
          <p className={styles.collection}>{active.label} · {active.dateLabel.replace('LIVE · ','collected ')}</p>
          <details className={styles.sources}><summary>View cited sources</summary><p>{active.sources?.length?active.sources.join(' · '):'No sources supplied in this snapshot.'}</p></details>
        </div>
      </div>
      <aside className={styles.reportSummary} aria-label="Example summary">
        <p className={styles.smallLabel}>THE TAKEAWAY</p>
        <h3>Getting recommended is only half the story.</h3>
        <p>{brand} appears in {count} of {engines.length} collected assistant results. The destination can change from one assistant to another.</p>
        <div className={styles.routeSummary}>{engines.map(engine=><div key={engine.id}><span>{engine.label}</span><span aria-hidden="true">↗</span><strong>{engine.youAppears?engine.youDestLabel||'No link':'Not recommended'}</strong></div>)}</div>
        <div className={styles.insight}><span aria-hidden="true">↳</span><p><strong>Look beyond the mention.</strong> See whether AI sends shoppers to your store or a marketplace.</p></div>
        <p className={styles.summaryFine}>Each tab shows that assistant’s ranking. These snapshots use different collection dates; Claude also uses a different question.</p>
      </aside>
    </div>
  </div>;
}

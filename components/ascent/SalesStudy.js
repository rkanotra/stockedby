"use client";
import { useState } from 'react';
import { SALES_CASES, SALES_UNITS, reviewedSalesCases } from '@/lib/ascent/sales';
import Icon from '../studio/Icon';
import s from './ascent.module.css';

export default function SalesStudy({ progress, onStart }) {
  const reviewed = reviewedSalesCases(progress);
  const next = SALES_CASES.find(item => !reviewed.has(item.id));
  const [selectedId, setSelectedId] = useState(next?.id || SALES_CASES[0].id);
  const selected = SALES_CASES.find(item => item.id === selectedId);
  const unit = SALES_UNITS.find(item => item.id === selected.unit);
  const cases = SALES_CASES.filter(item => item.unit === unit.id);
  function selectUnit(id) {
    const items = SALES_CASES.filter(item => item.unit === id);
    setSelectedId((items.find(item => !reviewed.has(item.id)) || items[0]).id);
  }
  return <>
    <div className={s.pageHeading}><div><h1>Sales &amp; P&amp;L</h1>
      <p>Practise winning a customer, pricing the deal and defending the profit it earns.</p>
    </div><span className={s.pill}>{reviewed.size} / {SALES_CASES.length} cases reviewed</span></div>

    <div className={s.studyLayout}>
      <nav className={s.studyUnits} aria-label="Sales and P&L modules">
        {SALES_UNITS.map(item => {
          const items = SALES_CASES.filter(x => x.unit === item.id);
          const count = items.filter(x => reviewed.has(x.id)).length;
          return <button key={item.id} aria-pressed={unit.id === item.id} onClick={() => selectUnit(item.id)}>
            <strong>{item.title}</strong><span>{count} / {items.length}</span>
          </button>;
        })}
      </nav>
      <section className={s.studyUnit} aria-label={unit.title}>
        <h2>{unit.title}</h2><p>{unit.lesson}</p>
        <div className={s.studyExample}><strong>Worked example</strong><p>{unit.example}</p></div>
        <p className={s.studyReading}>Reading companion · <a href={unit.url} target="_blank" rel="noreferrer">{unit.book} ↗</a><br/><small>{unit.access}</small></p>
        <label className={s.studyCasePicker}>Practice case<select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {cases.map(item => <option key={item.id} value={item.id}>{item.title}{reviewed.has(item.id) ? ' · Reviewed' : ''}</option>)}
        </select></label>
        <article key={selected.id} className={s.studyCase}>
          <h3>{selected.title}</h3><p>{selected.prompt}</p>
          <button className={s.primary} onClick={() => onStart(selected)}>{reviewed.has(selected.id) ? 'Practise again' : 'Write my response'} <Icon name="arrow" size={16}/></button>
          <details><summary>Check the reasoning</summary><p>{selected.solution}</p></details>
        </article>
      </section>
    </div>
  </>;
}

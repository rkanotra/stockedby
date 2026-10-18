"use client";
import { useState } from 'react';
import { EXERCISES, DOMAINS, LEVELS, MODES, completedExerciseKeys } from '@/lib/ascent/catalog';
import Icon from '../studio/Icon';
import s from './ascent.module.css';
export default function Programme({progress,onStart}) {
  const [mode,setMode]=useState('all'),[domain,setDomain]=useState('all'),[level,setLevel]=useState('all'),[status,setStatus]=useState('all'),[query,setQuery]=useState(''),[limit,setLimit]=useState(12);
  const completed=completedExerciseKeys(progress);
  const matches=EXERCISES.filter(x=>(mode==='all'||x.kind===mode)&&(domain==='all'||x.domain===domain)&&(level==='all'||x.level===level)&&(status==='all'||(status==='reviewed')===completed.has(`${x.kind}:${x.id}`))&&`${x.title} ${x.domain} ${x.role||''} ${x.prompt}`.toLowerCase().includes(query.trim().toLowerCase()));
  const filter=(setter)=>(e)=>{setter(e.target.value);setLimit(12);};
  return <>
    <div className={s.pageHeading}><div><span className={s.kicker}>A LONGER RUN. A STRONGER PRACTICE.</span><h1>Your practice programme.</h1><p>200 exercises. Ten leadership capabilities. Build evidence through practice, reflection and another attempt.</p></div><span className={s.pill}>{completed.size} / 200 explored</span></div>
    <div className={s.programmeIntro}><Icon name="flow" size={22}/><div><strong>Start with a foundation. Work towards the boardroom.</strong><p>Choose any exercise or follow your next recommended practice. A completed exercise means you received a review—it is not a certification of mastery or CDO readiness.</p></div></div>
    <div className={s.programmeModes} aria-label="Training modules">
      {['scenario','story','recording','interview'].map(kind=>{const total=EXERCISES.filter(x=>x.kind===kind);const count=total.filter(x=>completed.has(`${kind}:${x.id}`)).length;return <button key={kind} aria-pressed={mode===kind} onClick={()=>{setMode(mode===kind?'all':kind);setLimit(12);}}><span>{MODES[kind]}</span><strong>{count}<small> / {total.length}</small></strong><span className={s.fine}>Exercises reviewed</span></button>;})}
    </div>
    <div className={s.programmeFilters}>
      <label>Search the programme<input type="search" value={query} onChange={filter(setQuery)} placeholder="Try board, AI, delegation…"/></label>
      <label>Capability<select value={domain} onChange={filter(setDomain)}><option value="all">All capabilities</option>{DOMAINS.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Level<select value={level} onChange={filter(setLevel)}><option value="all">All levels</option>{LEVELS.map(x=><option key={x}>{x}</option>)}</select></label>
      <label>Practice status<select value={status} onChange={filter(setStatus)}><option value="all">All exercises</option><option value="new">Not reviewed yet</option><option value="reviewed">Reviewed</option></select></label>
    </div>
    <div className={s.sectionTitle}><p role="status">{matches.length} exercises{mode!=='all'?` · ${MODES[mode]}`:''}</p><button className={s.textButton} onClick={()=>{setMode('all');setDomain('all');setLevel('all');setStatus('all');setQuery('');setLimit(12);}}>Reset filters</button></div>
    <div className={s.programmeCards}>{matches.slice(0,limit).map(x=><article key={`${x.kind}:${x.id}`}><div className={s.programmeMeta}><span>{MODES[x.kind]}</span><span>{x.level}</span></div><h2>{x.title}</h2><span className={s.kicker}>{x.domain}</span><p>{x.prompt}</p><footer><small>{x.minutes} min · {completed.has(`${x.kind}:${x.id}`)?'Reviewed':'New exercise'}</small><button className={s.secondary} onClick={()=>onStart(x)}>{completed.has(`${x.kind}:${x.id}`)?'Practise again':'Start practice'} <Icon name="arrow" size={16}/></button></footer></article>)}</div>
    {!matches.length&&<div className={s.programmeIntro}><p>No exercises match these filters. Try a broader search or reset the filters.</p></div>}
    {matches.length>limit&&<button className={s.secondary} onClick={()=>setLimit(n=>n+12)}>Show 12 more · {matches.length-limit} remaining</button>}
    <section className={s.programmeIntro}><div><strong>Make each week deliberate.</strong><p>Practise a difficult conversation, shape one evidence-backed story, record it, then answer a related interview question. Revisit feedback before adding more exercises. Use your roadmap to connect practice with real work, mentoring and the experience you still need.</p></div></section>
  </>;
}

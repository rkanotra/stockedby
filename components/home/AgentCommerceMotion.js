'use client';

import Image from 'next/image';
import { useEffect, useId, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { agentCommerceReducer, DEMO_PHASES, INITIAL_DEMO_STATE } from '@/lib/agentCommerceDemo';
import styles from './agent-commerce.module.css';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback) {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
function getMotion() { return window.matchMedia(REDUCED_MOTION).matches; }
function subscribeVisibility(callback) {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
}
function getVisibility() { return document.visibilityState === 'visible'; }
function serverSnapshot() { return false; }

function CheckIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function AgentCommerceMotion() {
  const [state, dispatch] = useReducer(agentCommerceReducer, INITIAL_DEMO_STATE);
  const [inView, setInView] = useState(false);
  const rootRef = useRef(null);
  const playerRef = useRef(null);
  const remaining = useRef({ phase: 0, ms: DEMO_PHASES[0].duration });
  const descriptionId = useId();
  const reducedMotion = useSyncExternalStore(subscribeMotion, getMotion, serverSnapshot);
  const pageVisible = useSyncExternalStore(subscribeVisibility, getVisibility, serverSnapshot);
  const phase = reducedMotion && state.phase < 3 ? 3 : state.phase;
  const content = DEMO_PHASES[phase];
  const running = state.playing && !reducedMotion && inView && pageVisible;

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    if (rootRef.current) observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (remaining.current.phase !== state.phase) {
      remaining.current = { phase: state.phase, ms: DEMO_PHASES[state.phase].duration };
    }
    if (!running || remaining.current.ms === null) return;
    const started = performance.now();
    const timer = window.setTimeout(() => dispatch({ type: 'advance' }), remaining.current.ms);
    return () => {
      window.clearTimeout(timer);
      remaining.current.ms = Math.max(0, remaining.current.ms - (performance.now() - started));
    };
  }, [running, state.phase]);

  function handlePlayer() {
    if (phase === 3 || phase === 5) {
      remaining.current = { phase: 0, ms: DEMO_PHASES[0].duration };
      dispatch({ type: 'replay' });
    } else dispatch({ type: 'toggle' });
  }

  function approve() {
    dispatch({ type: 'approve', reducedMotion });
    playerRef.current?.focus({ preventScroll: true });
  }

  return (
    <section ref={rootRef} className={styles.motion} data-phase={phase} data-running={running} aria-label="Illustrative agent shopping journey" aria-describedby={descriptionId}>
      <div className={styles.header}><span>FROM QUESTION TO PURCHASE</span><span id={descriptionId}>Interactive demo · No real payment</span></div>
      <div className={styles.stage}>
        <div className={styles.product} aria-hidden="true">
          <Image src="/brand/commerce-display.webp" alt="" width={1200} height={800} sizes="(max-width: 760px) 100vw, 50vw" priority />
          <div className={styles.scan} /><div className={styles.target} />
          <div className={styles.found}><CheckIcon />Product matched</div>
        </div>
        <svg className={styles.trail} viewBox="0 0 700 420" preserveAspectRatio="none" aria-hidden="true">
          <path className={styles.path} d="M252 180 C360 180 332 302 454 302" />
          <path className={styles.packet} pathLength="100" d="M252 180 C360 180 332 302 454 302" />
        </svg>
        <div className={styles.agent}>
          <div className={styles.agentHead}><span className={styles.orb} aria-hidden="true" /><span>Shopping agent</span><span className={styles.agentStatus}>{content.status}</span></div>
          <div className={styles.body}>
            <div className={styles.phaseLabel}>{content.label}</div>
            <h2 className={styles.message}>{content.title}</h2>
            <p className={styles.detail}>{content.detail}</p>
            <div className={styles.constraint}>{content.constraint}</div>
            {phase === 3 && <button type="button" className={styles.approve} onClick={approve}><CheckIcon /><span>Approve demo payment · ₹2,490</span></button>}
          </div>
        </div>
        <div className={styles.receipt} aria-hidden={phase !== 5}>
          <div className={styles.receiptHead}><span className={styles.confirm}><CheckIcon /></span>Order confirmed</div>
          <div className={styles.receiptRow}><span>White sneakers</span><span>× 1</span></div>
          <div className={`${styles.receiptRow} ${styles.total}`}><span>Total</span><span>₹2,490</span></div>
          <div className={styles.receiptFoot}>Paid to your store · Demo receipt</div>
        </div>
      </div>
      <div className={styles.bottom}>
        <ol className={styles.track} aria-label="Agent journey">
          {['Discover', 'Verify', 'Approve', 'Pay'].map((label, index) => <li key={label} className={index < content.step || phase === 5 ? styles.done : index === content.step ? styles.active : undefined} aria-current={index === content.step ? 'step' : undefined}><span aria-hidden="true">0{index + 1}</span>{label}</li>)}
        </ol>
        <div className={styles.player}><button ref={playerRef} type="button" onClick={handlePlayer}>{phase === 5 ? 'Replay journey' : phase === 3 ? 'Replay from start' : state.playing ? 'Pause motion' : 'Play motion'}</button><span>Shopper control, at every purchase.</span></div>
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite">{phase === 3 ? 'Demo is waiting for shopper approval. No real payment is made.' : phase === 5 ? 'Demo order confirmed. No real payment was made.' : ''}</span>
    </section>
  );
}

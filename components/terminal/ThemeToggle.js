'use client';
import { useSyncExternalStore } from 'react';
import t from './theme.module.css';

import { APPEARANCE_KEY as KEY } from '@/lib/terminal/appearance';
const EVENT = 'stockedby-appearance-change';
const snapshot = () => document.documentElement.dataset.stockedbyTheme === 'dark' ? 'dark' : 'light';
const serverSnapshot = () => 'light';
function subscribe(callback) {
  const sync = event => {
    if (event.key !== KEY && event.key !== null) return;
    document.documentElement.dataset.stockedbyTheme = event.newValue === 'dark' ? 'dark' : 'light';
    callback();
  };
  window.addEventListener(EVENT, callback);
  window.addEventListener('storage', sync);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener('storage', sync); };
}
export function useAppearance() { return useSyncExternalStore(subscribe, snapshot, serverSnapshot); }

export default function ThemeToggle() {
  const theme = useAppearance();
  const dark = theme === 'dark';
  function toggle() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.stockedbyTheme = next;
    try { localStorage.setItem(KEY, next); } catch { /* Works for this page when storage is restricted. */ }
    window.dispatchEvent(new Event(EVENT));
  }
  return <button type="button" className={t.toggle} onClick={toggle} aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`Switch to ${dark ? 'light' : 'dark'} mode`}>
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{dark ? <path d="M20.8 13.3A9 9 0 0 1 10.7 3.2 9 9 0 1 0 20.8 13.3Z"/> : <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>}</svg>
    <span>{dark ? 'Dark' : 'Light'}</span>
  </button>;
}

export function BrandMark() {
  return <svg viewBox="0 0 32 32" width="32" height="32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="10" fill="#f5b58b"/><path d="M9 23 23 9M13 9h10v10M9 15v8h8" stroke="#482b1b" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function DeskIcon({type='Overview',size=20}) {
  const paths = {
    Overview: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    Markets: <><path d="M3 18 8 12l4 3 8-10M15 5h5v5M3 22h18"/></>,
    Portfolio: <><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M8 6V3h8v3M3 12h18M10 12v3h4v-3"/></>,
    News: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h4M8 18h8"/></>,
    Screener: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="currentColor"/><circle cx="16" cy="12" r="2" fill="currentColor"/><circle cx="8" cy="18" r="2" fill="currentColor"/></>,
    Research: <path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"/>,
    Activity: <><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4"/></>,
    Settings: <><circle cx="12" cy="12" r="3"/><path d="m9 3-1 3-3 1-2 3 2 2-1 3 3 2 1 3 4 1 2-3 3-1 3-3-2-3 1-3-3-2-1-3Z"/></>,
    Upload: <><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6"/></>,
    Arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    Lock: <><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]||paths.Overview}</svg>;
}

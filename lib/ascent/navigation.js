import { isId } from './schema.js';
const views = new Set(['home', 'programme', 'scenario', 'story', 'recording', 'interview', 'reflection', 'roadmap', 'history', 'account']);
// URLs contain only a view or opaque session ID, never an answer or a signed media URL.
export function studioLocation(hash) {
  const params = new URLSearchParams((hash || '').replace(/^#/, ''));
  const id = params.get('session');
  if (isId(id)) return { view: 'session', id };
  const view = params.get('view');
  return { view: views.has(view) ? view : 'home', id: null };
}
export function studioHash(view, id) {
  if (view === 'session' && isId(id)) return `#session=${id}`;
  return views.has(view) && view !== 'home' ? `#view=${view}` : '';
}

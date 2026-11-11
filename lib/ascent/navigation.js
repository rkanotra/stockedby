import { isId } from './schema.js';
import { findSalesCase } from './sales.js';
const views = new Set(['home', 'programme', 'sales', 'scenario', 'story', 'recording', 'interview', 'reflection', 'roadmap', 'history', 'account']);
// URLs contain only a view or opaque session ID, never an answer or a signed media URL.
export function studioLocation(hash) {
  const params = new URLSearchParams((hash || '').replace(/^#/, ''));
  const id = params.get('session');
  if (isId(id)) return { view: 'session', id };
  const view = params.get('view');
  const salesCase = view === 'scenario' && findSalesCase(params.get('case'));
  if (salesCase) return { view, id: null, caseId: salesCase.id };
  return { view: views.has(view) ? view : 'home', id: null };
}
export function studioHash(view, id, caseId) {
  if (view === 'session' && isId(id)) return `#session=${id}`;
  if (view === 'scenario' && findSalesCase(caseId)) return `#view=scenario&case=${caseId}`;
  return views.has(view) && view !== 'home' ? `#view=${view}` : '';
}

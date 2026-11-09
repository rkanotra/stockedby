import { importPortfolioImage } from '@/lib/terminal/imageImportServer';
import { json, readBody } from '@/lib/team/server';
import { requireTerminalUser, terminalStore, terminalFailure } from '@/lib/terminal/server';
import { runDossier } from '@/lib/terminal/dossier';
import { scan } from '@/lib/terminal/scan';
export const maxDuration = 300;
export async function POST(request) {
  // Share the existing AI function on the Hobby plan. JSON research requests
  // keep their original path; bounded multipart uploads use the OCR handler.
  if (request.headers.get('content-type')?.startsWith('multipart/form-data')) return importPortfolioImage(request);
  try { const { db, owner } = await requireTerminalUser(), body = await readBody(request, 16000); if (body.kind === 'dossier') return json(await runDossier(terminalStore(db), { security:body.security, mode:body.mode, thesis:body.thesis, horizon:body.horizon })); if (!['refresh','brief','ideas','review'].includes(body.kind) || !['All','India','US'].includes(body.market || 'All') || (body.security && !/^[A-Z]+:[A-Z0-9.^&=_/-]{1,40}$/.test(body.security))) return json({ error: 'Choose a scan type, market and security.' }, 400); return json(await scan(terminalStore(db), { kind: body.kind, market: body.market || 'All', security: body.security || null, personalFeed: owner })); } catch (e) { return terminalFailure(e); }
}

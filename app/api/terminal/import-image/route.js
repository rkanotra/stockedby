import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import { sameOriginRequest } from '@/lib/auth/requestOrigin';
import { json } from '@/lib/team/server';
import { requireTerminalUser, terminalStore, terminalFailure } from '@/lib/terminal/server';
import { imageMime } from '@/lib/studio/image-input';
import { IMAGE_LIMIT, imageImportRequest, parseImageImport } from '@/lib/terminal/imageImport';

export const runtime = 'nodejs';
export const maxDuration = 90;

export async function POST(request) {
  let store, reservation;
  try {
    if (!sameOriginRequest(request)) return json({ error: 'Open StockedBy to import a screenshot.' }, 403);
    const { db } = await requireTerminalUser();
    if (!process.env.OPENAI_API_KEY) return json({ error: 'Screenshot reading is unavailable. You can still import a CSV or add a position.' }, 503);
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data')) return json({ error: 'Choose a PNG, JPEG or WebP screenshot.' }, 400);
    // Bound the stream, including when Content-Length is missing.
    const limit = IMAGE_LIMIT + 100_000;
    if (Number(request.headers.get('content-length')) > limit) return json({ error: 'Use a screenshot smaller than 3 MB.' }, 413);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'Choose a screenshot first.' }, 400);
    const chunks = []; let length = 0;
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.length;
      if (length > limit) { await reader.cancel(); return json({ error: 'Use a screenshot smaller than 3 MB.' }, 413); }
      chunks.push(value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { 'content-type': request.headers.get('content-type') } }).formData();
    const file = form.get('file');
    if (!file || typeof file.arrayBuffer !== 'function' || !file.size || file.size > IMAGE_LIMIT) return json({ error: 'Choose a PNG, JPEG or WebP screenshot under 3 MB.' }, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    let mime;
    try { mime = imageMime(buffer, file.name.toLowerCase().split('.').pop()); } catch (e) { return json({ error: e.message }, 422); }
    store = terminalStore(db);
    // Reuse the database-backed AI quota and lease. No screenshot or extracted
    // position is stored in the run record; holdings save only after confirmation.
    reservation = await store('begin', { key: `image-import:${randomUUID()}`, kind: 'screenshot' });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 65000, maxRetries: 0 });
    const response = await client.responses.create(imageImportRequest(buffer, mime, process.env.TERMINAL_OCR_MODEL || 'gpt-4.1-mini'), { signal: request.signal });
    const result = parseImageImport(response);
    await store('finish', { ...reservation, status: 'complete', alerts: [], result: { kind: 'screenshot', count: result.holdings.length, errors: [], research: [], usage: { provider: 'OpenAI', model: response.model, input: response.usage?.input_tokens, output: response.usage?.output_tokens } } });
    return json(result);
  } catch (e) {
    if (reservation) await store('finish', { ...reservation, status: 'failed', alerts: [], result: { kind: 'screenshot', errors: ['Screenshot extraction did not complete. No holdings were saved.'], research: [] } }).catch(() => {});
    if (!reservation && e?.status) return terminalFailure(e);
    return json({ error: 'Could not read this screenshot. Try a clear crop of the holdings table, or use CSV. No holdings were saved.' }, 502);
  }
}

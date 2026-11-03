import { json } from '@/lib/team/server';
import { requireTerminalUser, terminalStore, terminalFailure } from '@/lib/terminal/server';
import { fetchNews } from '@/lib/terminal/news';
export const maxDuration=60;
export async function GET() { try { const {db}=await requireTerminalUser(),store=terminalStore(db),state=await store('load'),wire=await fetchNews(state.cache.wire);await store('cache',{key:'wire',data:wire});return json(wire); } catch(e){return terminalFailure(e);} }

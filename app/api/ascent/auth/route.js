import { cookies } from 'next/headers';
import { teamClient, readBody, json } from '@/lib/team/server';
import { requireAscentUser } from '@/lib/ascent/server';
import { signInAscent, passwordUpdate, passwordError } from '@/lib/ascent/passwordAuth';
import { checkAndConsume, getClientIp } from '@/lib/rateLimit';
import { TEAM_RETURN_COOKIE } from '@/lib/auth/teamReturn';
export const runtime = 'nodejs';
function failed(error) {
  const status = [400, 401, 403, 429].includes(error?.status) ? error.status : 503;
  return json({ error: status === 503 ? 'Sign-in is temporarily unavailable. Please try again.' : error.message }, status);
}
export async function POST(request) {
  try {
    const body = await readBody(request, 3000);
    if (!checkAndConsume(getClientIp(request), { namespace: 'ascent-password-login', limit: 20 }).allowed)
      return json({ error: 'Too many sign-in attempts. Please try again later.' }, 429);
    const result = await signInAscent(await teamClient(), body);
    (await cookies()).delete(TEAM_RETURN_COOKIE);
    return json(result);
  } catch (error) { return failed(error); }
}
export async function PATCH(request) {
  try {
    const body = await readBody(request, 3000);
    const { db, user } = await requireAscentUser();
    if (!checkAndConsume(user.id, { namespace: 'ascent-password-change', limit: 10 }).allowed)
      return json({ error: 'Too many password changes. Please try again later.' }, 429);
    const { error } = await db.auth.updateUser(passwordUpdate(body));
    if (error) return json({ error: passwordError(error) }, 400);
    return json({ ok: true });
  } catch (error) { return failed(error); }
}

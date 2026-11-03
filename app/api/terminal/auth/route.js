import { cookies } from 'next/headers';
import { teamClient, readBody, json } from '@/lib/team/server';
import { requireTerminalUser, terminalFailure } from '@/lib/terminal/server';
import { checkAndConsume, getClientIp } from '@/lib/rateLimit';
import { TEAM_RETURN_COOKIE, TEAM_RETURN_COOKIE_OPTIONS } from '@/lib/auth/teamReturn';
export async function POST(request) {
  try {
    const body = await readBody(request, 4000), db = await teamClient();
    if (body.mode === 'signout') { await db.auth.signOut(); return json({ ok: true }); }
    if (!checkAndConsume(getClientIp(request), { namespace: 'terminal-login', limit: 20 }).allowed) return json({ error: 'Too many attempts. Try again later.' }, 429);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: 'Enter a valid email address.' }, 400);
    if (body.mode === 'email') {
      const { data: allowed, error: checkError } = await db.rpc('terminal_login_allowed', { address: email });
      if (checkError) return json({ error: 'Sign-in is being connected. Please try again shortly.' }, 503);
      if (allowed) {
        const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: `${new URL(request.url).origin}/api/team/auth/callback` } });
        if (error) return json({ error: 'The sign-in email could not be sent. Please try again later.' }, 503);
        (await cookies()).set(TEAM_RETURN_COOKIE, '/terminal', TEAM_RETURN_COOKIE_OPTIONS);
      }
      return json({ message: 'If you’re invited, a sign-in link is on its way. Open it in this browser. You can set a password in Settings afterward.' });
    }
    const { data, error } = await db.auth.signInWithPassword({ email, password: String(body.password || '') });
    if (error || !data.user?.email_confirmed_at) return json({ error: 'Check your email and password, or use a sign-in link.' }, 401);
    const { data: allowed } = await db.rpc('terminal_allowed');
    if (!allowed) { await db.auth.signOut(); return json({ error: 'This account hasn’t been invited to the pilot yet.' }, 403); }
    return json({ ok: true });
  } catch (e) { return terminalFailure(e); }
}
export async function PATCH(request) {
  try { const { db } = await requireTerminalUser(), body = await readBody(request, 3000); if (typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128) return json({ error: 'Use a password of 10–128 characters.' }, 400); const { error } = await db.auth.updateUser({ password: body.password }); if (error) return json({ error: 'Could not update the password. Sign in again and retry.' }, 400); return json({ ok: true }); } catch (e) { return terminalFailure(e); }
}

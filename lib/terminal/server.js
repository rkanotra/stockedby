import { requireTeamUser, json } from '../team/server.js';
import { isAscentOwner } from '../ascent/access.js';
export async function requireTerminalUser() {
  const { db, user } = await requireTeamUser();
  const { data, error } = await db.rpc('terminal_allowed');
  if (error) throw Object.assign(Error('Portfolio storage is being connected. Please try again shortly.'), { status: 503 });
  if (!data) throw Object.assign(Error('StockedBy is an invited pilot. This account does not have access yet.'), { status: 403 });
  return { db, user, owner: isAscentOwner(user) };
}
export function terminalStore(db) {
  return async (action, args = {}) => {
    const { data, error } = await db.rpc('terminal_command', { action, args });
    if (error) {
      const message = /conflict|Another scan|limit reached|lease expired/.test(error.message) ? error.message : 'Portfolio storage did not complete this action. Try again.';
      throw Object.assign(Error(message), { status: /conflict|Another scan/.test(message) ? 409 : /limit reached/.test(message) ? 429 : 503 });
    }
    return data;
  };
}
export function terminalFailure(e) { return json({ error: e?.status ? e.message : 'This action could not be completed. Check the inputs and try again.' }, e?.status || 400); }

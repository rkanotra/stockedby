import { isAscentOwner, isAscentOwnerEmail } from './access.js';
const denied = () => Object.assign(Error('Email or password is incorrect, or this account does not have access.'), { status: 401 });
export async function signInAscent(db, input) {
  if (!isAscentOwnerEmail(input.email) || typeof input.password !== 'string' || !input.password || input.password.length > 128) throw denied();
  const { data, error } = await db.auth.signInWithPassword({ email: input.email.trim().toLowerCase(), password: input.password });
  if (error || !data?.user || !data?.session) {
    if (error?.status === 429) throw Object.assign(Error('Too many sign-in attempts. Please wait a few minutes and try again.'), { status: 429 });
    throw denied();
  }
  if (!isAscentOwner(data.user)) { await db.auth.signOut(); throw denied(); }
  const membership = await db.from('ascent_members').select('enabled').eq('user_id', data.user.id).maybeSingle();
  if (membership.error || !membership.data?.enabled) { await db.auth.signOut(); throw denied(); }
  return { ok: true };
}
export function passwordUpdate(input) {
  if (typeof input.password !== 'string' || input.password.length < 6 || input.password.length > 128) throw Object.assign(Error('Choose a password between 6 and 128 characters.'), { status: 400 });
  if (input.password !== input.confirmPassword) throw Object.assign(Error('The passwords do not match.'), { status: 400 });
  if (input.currentPassword !== undefined && (typeof input.currentPassword !== 'string' || input.currentPassword.length > 128)) throw Object.assign(Error('Check your current password.'), { status: 400 });
  return { password: input.password, ...(input.currentPassword ? { current_password: input.currentPassword } : {}) };
}
export function passwordError(error) {
  if (['reauthentication_needed', 'reauthentication_not_valid'].includes(error?.code)) return 'Please sign in again before setting your password. Your saved work is unchanged.';
  if (error?.code === 'same_password') return 'This is already your password. You can use it to sign in.';
  if (error?.code === 'weak_password') return 'This password does not meet the account requirements. Choose a longer, less common password.';
  if (['invalid_credentials', 'current_password_invalid', 'current_password_required'].includes(error?.code)) return 'Enter your current password to make this change.';
  return 'The password could not be saved. Please try again; your existing sign-in is unchanged.';
}

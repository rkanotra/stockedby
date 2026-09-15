import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, getMerchantForSessionToken } from "./session.js";

// Server Component guard: reads the session cookie (next/headers'
// cookies() is read-only in Server Components — only a Route Handler can
// set/clear it, see app/api/auth/*), resolves the merchant, and redirects
// to /login if there isn't a valid one. Every protected page under
// app/dashboard/* calls this first, same "guard at the top of the page"
// shape as this codebase's existing gates (e.g. LeadGate.js), just
// server-side instead of client-side.
export async function requireMerchant(next = "/dashboard") {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  const merchant = token ? await getMerchantForSessionToken(token) : null;
  if (!merchant) redirect(`/login?next=${encodeURIComponent(next)}`);
  return merchant;
}

// Non-redirecting variant for places that want to render differently when
// logged out rather than bounce away (none yet, but kept separate from
// requireMerchant() so a future public/private hybrid page doesn't have to
// fight redirect()).
export async function getOptionalMerchant() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE_NAME)?.value;
  return token ? await getMerchantForSessionToken(token) : null;
}

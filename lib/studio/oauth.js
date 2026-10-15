import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
export const PROVIDERS = ["jira", "figma"];
export function settings(provider) {
  if (!PROVIDERS.includes(provider)) throw Error("Unknown connector.");
  const name = provider.toUpperCase();
  return {
    clientId: process.env[name + "_CLIENT_ID"],
    clientSecret: process.env[name + "_CLIENT_SECRET"],
    secret: process.env.STUDIO_CONNECTOR_SECRET,
  };
}
export function isConfigured(provider) {
  const s = settings(provider);
  return !!(s.clientId && s.clientSecret && s.secret?.length >= 32);
}
export function cookieName(provider, state = false) {
  return "sb_" + provider + (state ? "_state" : "_session");
}
export function seal(value, secret = process.env.STUDIO_CONNECTOR_SECRET) {
  if (!secret || secret.length < 32)
    throw Error("Connector encryption is not configured.");
  const iv = randomBytes(12),
    cipher = createCipheriv(
      "aes-256-gcm",
      createHash("sha256").update(secret).digest(),
      iv,
    );
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  const result = Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
  if (result.length > 3700) throw Error("Connector session is too large.");
  return result;
}
export function unseal(value, secret = process.env.STUDIO_CONNECTOR_SECRET) {
  try {
    if (!secret || !value) return null;
    const b = Buffer.from(value, "base64url");
    const d = createDecipheriv(
      "aes-256-gcm",
      createHash("sha256").update(secret).digest(),
      b.subarray(0, 12),
    );
    d.setAuthTag(b.subarray(12, 28));
    const result = JSON.parse(
      Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"),
    );
    return result.exp > Date.now() ? result : null;
  } catch {
    return null;
  }
}
export function cookieOptions(seconds = 3600) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/studio/connectors",
    maxAge: seconds,
  };
}
export function callbackUrl(provider) {
  const origin = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://stockedby.com",
  ).origin;
  return `${origin}/api/studio/connectors/${provider}/callback`;
}
export function startOAuth(provider) {
  const cfg = settings(provider);
  const state = randomBytes(24).toString("base64url"),
    verifier = randomBytes(32).toString("base64url");
  const url = new URL(
    provider === "jira"
      ? "https://auth.atlassian.com/authorize"
      : "https://www.figma.com/oauth",
  );
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", callbackUrl(provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set(
    "scope",
    provider === "jira"
      ? "read:jira-work write:jira-work"
      : "file_content:read",
  );
  if (provider === "jira") {
    url.searchParams.set("audience", "api.atlassian.com");
    url.searchParams.set("prompt", "consent");
  } else {
    url.searchParams.set(
      "code_challenge",
      createHash("sha256").update(verifier).digest("base64url"),
    );
    url.searchParams.set("code_challenge_method", "S256");
  }
  return {
    url: url.toString(),
    state: { state, verifier, provider, exp: Date.now() + 600000 },
  };
}
export async function exchange(provider, code, state) {
  const cfg = settings(provider);
  const request =
    provider === "jira"
      ? {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "authorization_code",
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            code,
            redirect_uri: callbackUrl(provider),
          }),
        }
      : {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization:
              "Basic " +
              Buffer.from(cfg.clientId + ":" + cfg.clientSecret).toString(
                "base64",
              ),
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: callbackUrl(provider),
            code_verifier: state.verifier,
          }).toString(),
        };
  const r = await fetch(
    provider === "jira"
      ? "https://auth.atlassian.com/oauth/token"
      : "https://api.figma.com/v1/oauth/token",
    {
      method: "POST",
      ...request,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    },
  );
  if (!r.ok) throw Error("Authorization could not be completed.");
  const d = await r.json();
  if (typeof d.access_token !== "string")
    throw Error("No access token returned.");
  return {
    provider,
    accessToken: d.access_token,
    exp: Date.now() + Math.min(Number(d.expires_in) || 3600, 3600) * 1000,
  };
}
export async function providerFetch(url, token, options = {}) {
  const u = new URL(url);
  if (
    !["api.atlassian.com", "api.figma.com"].includes(u.hostname) ||
    u.protocol !== "https:"
  )
    throw Error("Unsupported connector destination.");
  const r = await fetch(u, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: "Bearer " + token,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!r.ok) {
    const e = new Error(
      r.status === 401
        ? "Your connection expired. Connect again."
        : r.status === 403
          ? "Your account does not have access to this resource."
          : r.status === 429
            ? "The provider rate limit was reached. Try again later."
            : `The provider rejected the request (${r.status}). Check the project permissions and required fields.`,
    );
    e.status = r.status;
    throw e;
  }
  if (r.status === 204) return {};
  const text = await r.text();
  if (text.length > 8000000)
    throw Error("Choose a smaller file or a specific Figma frame.");
  try {
    return JSON.parse(text);
  } catch {
    throw Error(
      "The provider returned an unreadable response. Try again later.",
    );
  }
}

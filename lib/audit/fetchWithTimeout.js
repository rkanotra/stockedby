import { assertPublicHostname } from "./ssrfGuard";

async function fetchOnce(url, { timeoutMs, ...init }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
}

// Redirects are followed manually (never fetch's own redirect:"follow") so
// every hop's hostname gets the same SSRF check the original domain did —
// otherwise a malicious/compromised server could pass the initial check
// and then redirect us straight at an internal address. A same-site
// canonicalization redirect (www <-> bare, http -> https) still works
// normally; only a redirect whose target fails the check gets dropped.
export async function fetchWithTimeout(url, { timeoutMs = 8000, maxRedirects = 5, ...init } = {}) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await fetchOnce(current, { timeoutMs, ...init });
    if (res.status < 300 || res.status >= 400 || !res.headers.get("location")) {
      return res;
    }
    let next;
    try {
      next = new URL(res.headers.get("location"), current);
    } catch {
      return res; // malformed Location — surface the redirect response as-is
    }
    if (next.protocol !== "http:" && next.protocol !== "https:") return res;
    await assertPublicHostname(next.hostname); // throws BlockedHostError if unsafe — propagates to the caller
    current = next.toString();
  }
  throw new Error("Too many redirects");
}

// Fetches text with a byte cap so a huge/streaming response can't blow the
// function's memory or time budget. Returns ok:false on any failure
// (timeout, network error, non-2xx, blocked redirect target, over the cap)
// rather than throwing — callers treat "couldn't fetch" as an honest
// unknown, never a fabricated failure.
export async function fetchTextSafe(url, { timeoutMs = 8000, maxBytes = 2_000_000, headers } = {}) {
  let res;
  try {
    res = await fetchWithTimeout(url, { timeoutMs, headers });
  } catch {
    return { ok: false, status: null, text: null };
  }
  if (!res.ok) return { ok: false, status: res.status, text: null };

  const reader = res.body?.getReader?.();
  if (!reader) {
    const text = await res.text();
    return { ok: true, status: res.status, text: text.slice(0, maxBytes) };
  }
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  reader.cancel().catch(() => {});
  return { ok: true, status: res.status, text: text.slice(0, maxBytes) };
}

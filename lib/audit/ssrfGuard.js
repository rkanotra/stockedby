// The audit takes an arbitrary merchant-entered domain and fetches it
// server-side — a textbook SSRF surface (OWASP). Before any fetch, resolve
// the hostname and reject anything that lands on a private/loopback/
// link-local address (including cloud metadata endpoints like
// 169.254.169.254), not just an obvious "localhost" string — a
// public-looking hostname can still resolve to an internal IP.
import dns from "node:dns/promises";

function ipv4ToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function inRange(intIp, base, bits) {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (intIp & mask) === (ipv4ToInt(base) & mask);
}

// Loopback, RFC1918 private ranges, link-local (incl. cloud metadata),
// CGNAT, benchmark, multicast, reserved.
const IPV4_BLOCKED_BLOCKS = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
];

function isBlockedIPv4(ip) {
  const intIp = ipv4ToInt(ip);
  if (intIp === null) return true; // malformed — treat as unsafe
  return IPV4_BLOCKED_BLOCKS.some(([base, bits]) => inRange(intIp, base, bits));
}

function isBlockedIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
  if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique local
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedIPv4(mapped[1]);
  return false;
}

export class BlockedHostError extends Error {}

// Throws BlockedHostError if the hostname is (or resolves to) a
// private/internal address. Returns nothing on success.
export async function assertPublicHostname(hostname) {
  const h = (hostname || "").toLowerCase().trim();
  if (!h || h === "localhost" || h.endsWith(".localhost") || h === "0.0.0.0" || h === "[::1]") {
    throw new BlockedHostError("That host isn't allowed.");
  }

  let addresses;
  try {
    addresses = await dns.lookup(h, { all: true, verbatim: true });
  } catch {
    throw new BlockedHostError("Couldn't resolve that domain.");
  }
  if (addresses.length === 0) {
    throw new BlockedHostError("Couldn't resolve that domain.");
  }
  for (const { address, family } of addresses) {
    if (family === 4 && isBlockedIPv4(address)) throw new BlockedHostError("That host isn't allowed.");
    if (family === 6 && isBlockedIPv6(address)) throw new BlockedHostError("That host isn't allowed.");
  }
}

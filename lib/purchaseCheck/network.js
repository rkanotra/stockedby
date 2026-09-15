import https from "node:https";
import dns from "node:dns/promises";
import { isIP } from "node:net";

// Resolve once and pin that address to the TLS connection. Redirects are
// returned to the caller, where each new destination is validated again.
export function publicAddress(address) {
  if (isIP(address) !== 4) return false; // fail closed for IPv6-only stores
  const [a, b, c] = address.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || b === 2)) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export function allowedRequest(raw, method, origin) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password)
    return false;
  if (url.origin !== origin)
    return (
      method === "GET" &&
      ["cdn.shopify.com", "fonts.shopifycdn.com"].includes(url.hostname) &&
      !/checkouts|payments/i.test(url.pathname)
    );
  if (method === "GET" || method === "HEAD")
    return !/\/(?:wallets|payments|orders)(?:\/|$)|thank[_-]?you|processing|complete|\/account/i.test(
      url.pathname,
    );
  return (
    method === "POST" &&
    /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?cart\/(?:add|update|clear|prepare_shipping_rates)\.js$/i.test(
      url.pathname,
    )
  );
}
export async function pinnedRequest(
  raw,
  {
    method = "GET",
    headers = {},
    body,
    maxBytes = 2500000,
    timeout = 12000,
  } = {},
) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.port || url.username || url.password)
    throw new Error("unsafe_destination");
  const addresses = await dns.lookup(url.hostname, { all: true, family: 4 });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new Error("unsafe_destination");
  const address = addresses[0].address;
  const clean = Object.fromEntries(
    Object.entries(headers).filter(
      ([k]) =>
        ![
          "host",
          "connection",
          "content-length",
          "accept-encoding",
          "authorization",
          "proxy-authorization",
        ].includes(k.toLowerCase()),
    ),
  );
  clean["accept-encoding"] = "identity";
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method,
        headers: clean,
        agent: false,
        lookup: (_host, opts, cb) =>
          opts.all ? cb(null, [{ address, family: 4 }]) : cb(null, address, 4),
      },
      (res) => {
        const chunks = [];
        let size = 0;
        res.on("data", (chunk) => {
          size += chunk.length;
          if (size > maxBytes) {
            req.destroy(new Error("response_too_large"));
            res.destroy();
          } else chunks.push(chunk);
        });
        res.on("error", reject);
        res.on("end", () =>
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          }),
        );
      },
    );
    const deadline = setTimeout(
      () => req.destroy(new Error("request_timeout")),
      timeout,
    );
    req.on("close", () => clearTimeout(deadline));
    req.on("error", reject);
    req.end(body);
  });
}
export async function storeText(url, origin, maxBytes = 500000) {
  let next = new URL(url);
  for (let i = 0; i < 4; i++) {
    if (next.origin !== origin || next.protocol !== "https:")
      throw new Error(
        "Store redirected to a different domain. Save its canonical domain instead.",
      );
    const response = await pinnedRequest(next.href, { maxBytes });
    if (
      response.status >= 300 &&
      response.status < 400 &&
      response.headers.location
    ) {
      next = new URL(response.headers.location, next);
      continue;
    }
    if (response.status !== 200)
      throw new Error(
        "The store could not be read. Check its address and try again.",
      );
    return response.body.toString("utf8");
  }
  throw new Error("The store redirected too many times.");
}

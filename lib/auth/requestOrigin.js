// Next can reconstruct request.url with an internal hostname. The HTTP Host
// header describes the site the browser actually requested. Browser scripts
// cannot set Host; comparing it with Origin still rejects cross-site writes.
export function sameOriginRequest(request) {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const source = new URL(origin);
    const forwarded = request.headers.get('x-forwarded-proto');
    const protocol = ['http', 'https'].includes(forwarded)
      ? forwarded + ':'
      : new URL(request.url).protocol;
    return source.origin === origin && source.host.toLowerCase() === host.toLowerCase() && source.protocol === protocol;
  } catch { return false; }
}

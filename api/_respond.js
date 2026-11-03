// Minimal response helpers that work with both Vercel's Node runtime and Vite's dev middleware.
export function sendJSON(res, status, body, { cacheSeconds = 3600 } = {}) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  if (status === 200) {
    // Cache at Vercel's CDN; serve stale for a day while it refreshes in the background.
    res.setHeader('cache-control', `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`);
  } else {
    res.setHeader('cache-control', 'no-store');
  }
  res.end(JSON.stringify(body));
}

export function queryOf(req) {
  return new URL(req.url, 'http://localhost').searchParams;
}

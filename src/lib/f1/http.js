// Small fetch helper shared by the snapshot script, the Vercel functions and the browser.
// Spaces requests out per host and retries on rate limits (HTTP 429) or transient 5xx errors.

const lastCall = new Map();
const MIN_GAP_MS = { 'api.jolpi.ca': 300, 'api.openf1.org': 400 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function getJSON(url, { retries = 4, fetchImpl = fetch } = {}) {
  const host = new URL(url).host;
  for (let attempt = 0; ; attempt++) {
    const gap = MIN_GAP_MS[host] ?? 0;
    const wait = (lastCall.get(host) ?? 0) + gap - Date.now();
    if (wait > 0) await sleep(wait);
    lastCall.set(host, Date.now());

    let res;
    try {
      res = await fetchImpl(url, { headers: { accept: 'application/json' } });
    } catch (err) {
      if (attempt >= retries) throw err;
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res.json();
    if ((res.status === 429 || res.status >= 500) && attempt < retries) {
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(retryAfter ? retryAfter * 1000 : 1500 * 2 ** attempt);
      continue;
    }
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
}

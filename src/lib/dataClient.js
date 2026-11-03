// Hybrid data loading: try the cached live API first, fall back to the bundled snapshot.
const memo = new Map();

async function fetchJSON(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function loadWithFallback(liveUrl, snapshotUrl, { timeoutMs = 8000, fetcher = fetchJSON } = {}) {
  try {
    const data = await fetcher(liveUrl, timeoutMs);
    return { ...data, source: 'live' };
  } catch {
    const data = await fetcher(snapshotUrl, timeoutMs);
    return { ...data, source: 'snapshot' };
  }
}

function once(key, fn) {
  if (!memo.has(key)) {
    const p = fn();
    memo.set(key, p);
    p.catch(() => memo.delete(key));
  }
  return memo.get(key);
}

export const loadSeason = () => once('season', () => loadWithFallback('/api/season', '/data/season.json'));
export const loadRace = (round) =>
  once(`race:${round}`, () => loadWithFallback(`/api/race?round=${round}`, `/data/races/${round}.json`, { timeoutMs: 20000 }));

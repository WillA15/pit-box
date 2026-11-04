// Hybrid data loading. The bundled snapshot renders immediately; the cached live API
// is requested at the same time and replaces the snapshot when (and if) it arrives.
async function fetchJSON(url, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!(res.headers.get('content-type') ?? '').includes('json')) throw new Error('Not JSON');
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/** Resolve with live data, or the snapshot if live fails. (Used by tests and one-shot callers.) */
export async function loadWithFallback(liveUrl, snapshotUrl, { timeoutMs = 8000, fetcher = fetchJSON } = {}) {
  try {
    return { ...(await fetcher(liveUrl, timeoutMs)), source: 'live' };
  } catch {
    return { ...(await fetcher(snapshotUrl, timeoutMs)), source: 'snapshot' };
  }
}

/**
 * A shared, observable resource: { data, error, loading }.
 * Snapshot and live load in parallel; live wins whenever it succeeds.
 */
export function createResource(liveUrl, snapshotUrl, { timeoutMs = 20000, fetcher = fetchJSON } = {}) {
  let state = { data: null, error: null, loading: true };
  const listeners = new Set();
  const set = (next) => { state = { ...state, ...next }; listeners.forEach((fn) => fn()); };
  let liveDone = false;
  let snapFailed = false;
  let liveFailed = false;

  if (!liveUrl) liveFailed = true;
  (liveUrl ? fetcher(liveUrl, timeoutMs) : new Promise(() => {})).then(
    (d) => { liveDone = true; set({ data: { ...d, source: 'live' }, loading: false, error: null }); },
    (e) => { liveFailed = true; if (snapFailed) set({ error: e, loading: false }); },
  );
  fetcher(snapshotUrl, timeoutMs).then(
    (d) => { if (!liveDone) set({ data: { ...d, source: 'snapshot' }, loading: false }); },
    (e) => { snapFailed = true; if (liveFailed) set({ error: e, loading: false }); },
  );

  return {
    get: () => state,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

const resources = new Map();
export function resource(key, liveUrl, snapshotUrl) {
  if (!resources.has(key)) resources.set(key, createResource(liveUrl, snapshotUrl));
  const r = resources.get(key);
  // Retry next time if both sources failed.
  if (r.get().error) resources.delete(key);
  return r;
}

export const seasonResource = () => resource('season', '/api/season', '/data/season.json');
export const raceResource = (round) => resource(`race:${round}`, `/api/race?round=${round}`, `/data/races/${round}.json`);
// Circuit facts and outlines change rarely, so they only come from the bundled file.
export const circuitsResource = () => resource('circuits', null, '/data/circuits.json');
export const careersResource = () => resource('careers', null, '/data/careers.json');
// News: live feeds (cached 30 min) plus the bundled archive, merged by the page.
export const newsLiveResource = () => resource('news-live', '/api/news', '/data/news.json');
export const newsArchiveResource = () => resource('news-archive', null, '/data/news.json');

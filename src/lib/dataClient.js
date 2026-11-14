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

// Pick the newer of two datasets by standingsRound; prefer live on a tie or when it is missing.
function newer(live, snap) {
  const l = live?.standingsRound;
  const s = snap?.standingsRound;
  if (typeof l === 'number' && typeof s === 'number' && s > l) return snap;
  return live;
}

const STALE_MS = 10 * 60 * 1000;

/**
 * A shared, observable resource: { data, error, loading, liveLoading }.
 * Snapshot and live load in parallel; live wins unless the snapshot is clearly newer.
 * Options: timeoutMs, fetcher, refreshOnVisible (re-fetch live when the tab is shown and data is old).
 */
export function createResource(liveUrl, snapshotUrl, { timeoutMs = 20000, fetcher = fetchJSON, refreshOnVisible = false } = {}) {
  let state = { data: null, error: null, loading: true, liveLoading: Boolean(liveUrl) };
  const listeners = new Set();
  const set = (next) => { state = { ...state, ...next }; listeners.forEach((fn) => fn()); };
  let run = 0; // bumped on every (re)start so answers from an older run are ignored
  let liveDone = false;
  let snapFailed = false;
  let liveFailed = false;

  function start() {
    const me = ++run;
    liveDone = false; snapFailed = false; liveFailed = !liveUrl;
    set({ error: null, loading: state.data ? state.loading : true, liveLoading: Boolean(liveUrl) });
    if (liveUrl) {
      fetcher(liveUrl, timeoutMs).then(
        (d) => {
          if (me !== run) return;
          liveDone = true;
          const live = { ...d, source: 'live' };
          set({ data: state.data ? newer(live, state.data) : live, loading: false, error: null, liveLoading: false });
        },
        (e) => {
          if (me !== run) return;
          liveFailed = true;
          set({ liveLoading: false, ...(snapFailed ? { error: e, loading: false } : {}) });
        },
      );
    }
    fetcher(snapshotUrl, timeoutMs).then(
      (d) => { if (me === run && !liveDone) set({ data: { ...d, source: 'snapshot' }, loading: false }); },
      (e) => { if (me === run) { snapFailed = true; if (liveFailed) set({ error: e, loading: false }); } },
    );
  }
  start();

  // Fetch live data again when the tab comes back and what we have is over 10 minutes old.
  function refreshLive() {
    const t = Date.parse(state.data?.generatedAt);
    if (!liveUrl || state.liveLoading || !(Date.now() - t > STALE_MS)) return;
    set({ liveLoading: true });
    fetcher(liveUrl, timeoutMs).then(
      (d) => set({ data: newer({ ...d, source: 'live' }, state.data), liveLoading: false }),
      () => set({ liveLoading: false }),
    );
  }
  if (refreshOnVisible && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refreshLive();
    });
  }

  return {
    get: () => state,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    retry: start,
  };
}

const resources = new Map();
export function resource(key, liveUrl, snapshotUrl, options) {
  if (!resources.has(key)) resources.set(key, createResource(liveUrl, snapshotUrl, options));
  return resources.get(key);
}

export const seasonResource = () => resource('season', '/api/season', '/data/season.json', { refreshOnVisible: true });
export const raceResource = (round) => resource(`race:${round}`, `/api/race?round=${round}`, `/data/races/${round}.json`);
// Circuit facts and outlines change rarely, so they only come from the bundled file.
export const circuitsResource = () => resource('circuits', null, '/data/circuits.json');
export const careersResource = () => resource('careers', null, '/data/careers.json');
// News: live feeds (cached 30 min) plus the bundled archive, merged by the page.
export const newsLiveResource = () => resource('news-live', '/api/news', '/data/news.json');
export const newsArchiveResource = () => resource('news-archive', null, '/data/news.json');

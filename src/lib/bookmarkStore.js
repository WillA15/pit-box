// Followed drivers/teams. Today this persists to localStorage; the same interface
// (get / has / toggle / subscribe) can later be backed by a real account.
const KEY = 'pitbox.bookmarks.v1';
const EMPTY = Object.freeze({ drivers: [], teams: [] });

export function createBookmarkStore(storage) {
  const listeners = new Set();
  let state = read();

  function read() {
    try {
      const raw = JSON.parse(storage?.getItem(KEY) ?? 'null');
      if (raw && Array.isArray(raw.drivers) && Array.isArray(raw.teams)) return { drivers: raw.drivers, teams: raw.teams };
    } catch { /* corrupt or blocked storage: start empty */ }
    return EMPTY;
  }
  function write(next) {
    state = next;
    try { storage?.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
    listeners.forEach((fn) => fn());
  }

  return {
    get: () => state,
    has: (kind, id) => state[kind].includes(id),
    toggle(kind, id) {
      const list = state[kind];
      write({ ...state, [kind]: list.includes(id) ? list.filter((x) => x !== id) : [...list, id] });
    },
    clear: () => write(EMPTY),
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Re-read storage (e.g. another tab changed it). */
    refresh() {
      state = read();
      listeners.forEach((fn) => fn());
    },
  };
}

let safeStorage = null;
try { safeStorage = typeof window !== 'undefined' ? window.localStorage : null; } catch { safeStorage = null; }

export const bookmarks = createBookmarkStore(safeStorage);

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY) bookmarks.refresh(); });
}

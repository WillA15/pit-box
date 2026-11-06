// Tracks in-app navigation so a Back button knows where "back" goes, and whether there's
// anywhere to go back to inside Pit Box (it never sends people off-site).

/**
 * Pure reducer. state = { entries: [{ key, path }], index }.
 * action = { type: 'PUSH' | 'REPLACE' | 'POP', key, path }
 */
export function reduceHistory(state, { type, key, path }) {
  const entries = state?.entries ?? [];
  const index = state?.index ?? -1;
  // A full page load (typed URL, refresh, link from another site) always has the key "default":
  // start a fresh history so Back never points somewhere the browser can't actually go.
  if (!entries.length || key === 'default') return { entries: [{ key, path }], index: 0 };
  // Same entry reported twice (React may run effects twice in development).
  if (entries[index]?.key === key) {
    if (entries[index].path === path) return state;
    const next = [...entries];
    next[index] = { key, path };
    return { entries: next, index };
  }
  if (type === 'PUSH') {
    const next = [...entries.slice(0, index + 1), { key, path }];
    return { entries: next, index: next.length - 1 };
  }
  if (type === 'REPLACE') {
    const next = [...entries];
    next[index] = { key, path };
    return { entries: next, index };
  }
  // POP: browser back/forward. Find where we landed; if unknown (e.g. after a reload), start fresh.
  const found = entries.findIndex((e) => e.key === key);
  return found >= 0 ? { entries, index: found } : { entries: [{ key, path }], index: 0 };
}

export const previousEntry = (state) => (state && state.index > 0 ? state.entries[state.index - 1] : null);

const SECTIONS = {
  '': 'Home',
  standings: 'Standings',
  schedule: 'Schedule',
  tracks: 'Tracks',
  drivers: 'Driver Spotlight',
  'pit-wall': 'My Pit Wall',
};

/** Human label for a path, using season data for track and driver pages when available. */
export function labelForPath(path, season) {
  const [section = '', id] = path.split('?')[0].split('/').filter(Boolean);
  if (section === 'tracks' && id) {
    return season?.races.find((r) => r.round === Number(id))?.name ?? `Round ${id}`;
  }
  if (section === 'drivers' && id) {
    const d = season?.drivers[id];
    return d ? `${d.givenName} ${d.familyName}` : 'Driver';
  }
  return SECTIONS[section] ?? 'previous page';
}

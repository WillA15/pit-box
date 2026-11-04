import { useSyncExternalStore } from 'react';
import { bookmarks } from './bookmarkStore.js';

export function useBookmarks() {
  const state = useSyncExternalStore(bookmarks.subscribe, bookmarks.get, bookmarks.get);
  const has = (kind, id) => state[kind].includes(id);
  return {
    ...state,
    toggle: bookmarks.toggle,
    has,
    /** 'driver' if the driver is followed, 'team' if only their team is, otherwise null. */
    followLevel: (driverId, constructorId) => (has('drivers', driverId) ? 'driver' : constructorId && has('teams', constructorId) ? 'team' : null),
    count: state.drivers.length + state.teams.length,
  };
}

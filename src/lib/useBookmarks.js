import { useSyncExternalStore } from 'react';
import { bookmarks } from './bookmarkStore.js';

export function useBookmarks() {
  const state = useSyncExternalStore(bookmarks.subscribe, bookmarks.get, bookmarks.get);
  return { ...state, toggle: bookmarks.toggle, has: (kind, id) => state[kind].includes(id) };
}

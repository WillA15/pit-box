import { describe, it, expect, vi } from 'vitest';
import { createBookmarkStore } from '../../src/lib/bookmarkStore.js';

const memoryStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
};

describe('bookmarkStore', () => {
  it('toggles, persists and notifies', () => {
    const storage = memoryStorage();
    const store = createBookmarkStore(storage);
    const fn = vi.fn();
    store.subscribe(fn);
    store.toggle('drivers', 'norris');
    store.toggle('teams', 'mclaren');
    expect(store.has('drivers', 'norris')).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(createBookmarkStore(storage).get()).toEqual({ drivers: ['norris'], teams: ['mclaren'] });
    store.toggle('drivers', 'norris');
    expect(store.has('drivers', 'norris')).toBe(false);
  });
  it('survives corrupt or missing storage', () => {
    const broken = { getItem: () => '{oops', setItem: () => { throw new Error('blocked'); } };
    const store = createBookmarkStore(broken);
    expect(store.get()).toEqual({ drivers: [], teams: [] });
    expect(() => store.toggle('drivers', 'x')).not.toThrow();
    expect(createBookmarkStore(null).get().drivers).toEqual([]);
  });
});

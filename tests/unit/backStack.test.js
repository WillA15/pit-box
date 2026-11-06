import { describe, it, expect } from 'vitest';
import { reduceHistory, previousEntry, labelForPath } from '../../src/lib/backStack.js';

const go = (state, type, key, path) => reduceHistory(state, { type, key, path });

describe('reduceHistory', () => {
  it('has nothing to go back to on the first page', () => {
    const s = go(null, 'POP', 'a', '/standings');
    expect(previousEntry(s)).toBeNull();
  });
  it('tracks pushes and browser back/forward', () => {
    let s = go(null, 'POP', 'a', '/standings');
    s = go(s, 'PUSH', 'b', '/tracks/19');
    expect(previousEntry(s).path).toBe('/standings');
    s = go(s, 'POP', 'a', '/standings'); // back
    expect(previousEntry(s)).toBeNull();
    s = go(s, 'POP', 'b', '/tracks/19'); // forward
    expect(previousEntry(s).path).toBe('/standings');
  });
  it('a new page after going back drops the old forward history', () => {
    let s = go(null, 'POP', 'a', '/');
    s = go(s, 'PUSH', 'b', '/standings');
    s = go(s, 'PUSH', 'c', '/tracks/19');
    s = go(s, 'POP', 'b', '/standings');
    s = go(s, 'PUSH', 'd', '/schedule');
    expect(s.entries.map((e) => e.path)).toEqual(['/', '/standings', '/schedule']);
  });
  it('replace (e.g. switching Grand Prix/Sprint tab) keeps the same back target', () => {
    let s = go(null, 'POP', 'a', '/standings');
    s = go(s, 'PUSH', 'b', '/tracks/17');
    s = go(s, 'REPLACE', 'c', '/tracks/17?tab=sprint');
    expect(previousEntry(s).path).toBe('/standings');
  });
  it('an unknown pop (after a reload) starts fresh instead of guessing', () => {
    let s = go(null, 'POP', 'a', '/standings');
    s = go(s, 'POP', 'zzz', '/tracks/3');
    expect(previousEntry(s)).toBeNull();
  });
});

describe('repeated reports', () => {
  it('ignores the same location being reported twice', () => {
    let s = go(null, 'POP', 'a', '/standings');
    s = go(s, 'PUSH', 'b', '/tracks/19');
    s = go(s, 'PUSH', 'b', '/tracks/19');
    expect(s.entries).toHaveLength(2);
    expect(previousEntry(s).path).toBe('/standings');
  });
});

describe('labelForPath', () => {
  const season = { races: [{ round: 19, name: 'Mexico City Grand Prix' }], drivers: { norris: { givenName: 'Lando', familyName: 'Norris' } } };
  it('names sections, races and drivers', () => {
    expect(labelForPath('/standings', season)).toBe('Standings');
    expect(labelForPath('/', season)).toBe('Home');
    expect(labelForPath('/tracks/19?tab=sprint', season)).toBe('Mexico City Grand Prix');
    expect(labelForPath('/drivers/norris', season)).toBe('Lando Norris');
    expect(labelForPath('/tracks/99', season)).toBe('Round 99');
  });
});

describe('full page loads', () => {
  it('a fresh load (key "default") starts a new history, without looping', () => {
    let s = go(null, 'POP', 'default', '/tracks/8');
    s = go(s, 'PUSH', 'b', '/standings');
    s = go(s, 'POP', 'default', '/tracks');
    expect(s).toEqual({ entries: [{ key: 'default', path: '/tracks' }], index: 0 });
    expect(previousEntry(s)).toBeNull();
  });
});

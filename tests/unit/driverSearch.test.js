import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { searchDrivers, normalize } from '../../src/lib/driverSearch.js';

const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url)));
const all = Object.values(season.drivers);
const ids = (q) => searchDrivers(all, season, q).map((d) => d.id);
const teamOf = (id) => season.drivers[id].constructorId;

describe('normalize', () => {
  it('lower-cases, strips accents and squashes spaces', () => {
    expect(normalize('  Hülkenberg   PÉREZ ')).toBe('hulkenberg perez');
  });
});

describe('searchDrivers', () => {
  it('returns the list unchanged for an empty query', () => {
    expect(searchDrivers(all, season, '   ')).toBe(all);
  });

  it('narrows to drivers whose names start with a few letters, surname matches first', () => {
    const r = ids('ver');
    expect(r[0]).toBe('max_verstappen');
    expect(r).not.toContain('norris');
  });

  it('matches first names and ignores accents', () => {
    expect(ids('lando')[0]).toBe('norris');
    expect(ids('hulk')[0]).toBe('hulkenberg');
    expect(ids('perez')[0]).toBe('perez');
  });

  it('finds drivers by code and car number', () => {
    expect(ids('HAM')[0]).toBe('hamilton');
    expect(ids('44')[0]).toBe('hamilton');
  });

  it('typing a team name shows that team\'s drivers', () => {
    for (const [q, team] of [['ferr', 'ferrari'], ['mcl', 'mclaren'], ['red bull', 'red_bull'], ['aston', 'aston_martin'], ['racing bulls', 'rb']]) {
      const r = ids(q);
      expect(r.length, q).toBeGreaterThan(0);
      expect(r.every((id) => teamOf(id) === team), q).toBe(true);
      expect(r.length, q).toBe(all.filter((d) => d.constructorId === team).length);
    }
  });

  it('ranks a name match above a team match', () => {
    // "al" starts Albon and Alonso's names, and the Alpine team.
    const r = ids('al');
    const firstTeamOnly = r.findIndex((id) => !/^al/i.test(normalize(season.drivers[id].familyName)) && !/^al/i.test(normalize(season.drivers[id].givenName)));
    const lastName = r.findLastIndex((id) => /^al/.test(normalize(season.drivers[id].familyName)));
    expect(lastName).toBeLessThan(firstTeamOnly);
  });

  it('matches several words against name and team together', () => {
    expect(ids('max red')).toEqual(['max_verstappen']);
  });

  it('keeps the given order for equal matches and drops non-matches', () => {
    expect(ids('mercedes')).toEqual(all.filter((d) => d.constructorId === 'mercedes').map((d) => d.id));
    expect(ids('zzz')).toEqual([]);
  });
});

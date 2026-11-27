import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { searchTracks } from '../../src/lib/trackSearch.js';
import { podium } from '../../src/lib/schedule.js';

const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url)));
const rounds = (q) => searchTracks(season.races, season, q).map((r) => r.round);
const round = (name) => season.races.find((r) => r.name === name).round;

describe('searchTracks', () => {
  it('returns the calendar unchanged for an empty query', () => {
    expect(searchTracks(season.races, season, '')).toBe(season.races);
  });

  it('finds a race from its first few letters and drops the rest', () => {
    expect(rounds('brit')).toEqual([round('British Grand Prix')]);
    expect(rounds('mon')[0]).toBe(round('Monaco Grand Prix'));
    expect(rounds('zzz')).toEqual([]);
  });

  it('matches circuits, cities and countries, ignoring accents', () => {
    expect(rounds('silverstone')[0]).toBe(round('British Grand Prix'));
    expect(rounds('sao paulo')[0]).toBe(round('Brazilian Grand Prix'));
    expect(rounds('spain').sort((a, b) => a - b)).toEqual(season.races.filter((r) => r.country === 'Spain').map((r) => r.round));
  });

  it('understands common nicknames', () => {
    expect(rounds('vegas')[0]).toBe(round('Las Vegas Grand Prix'));
    expect(rounds('cota')[0]).toBe(round('United States Grand Prix'));
    expect(rounds('uk')[0]).toBe(round('British Grand Prix'));
    expect(rounds('usa').sort((a, b) => a - b)).toEqual(season.races.filter((r) => r.country === 'USA').map((r) => r.round));
  });

  it('finds a round by number, exact round first', () => {
    const r = rounds('1');
    expect(r[0]).toBe(1);
    expect(r.slice(1).every((n) => String(n).startsWith('1'))).toBe(true);
    expect(rounds('R5')[0]).toBe(5);
  });

  it('typing a driver or team shows the races they won, after any place match', () => {
    const won = (pred) => season.races.filter((r) => podium(r)[0] && pred(podium(r)[0])).map((r) => r.round);
    expect(rounds('verstappen')).toEqual(won((w) => w.driverId === 'max_verstappen'));
    // "red bull" is also in the Red Bull Ring's name, so the Austrian GP comes first.
    const rb = rounds('red bull');
    expect(rb[0]).toBe(round('Austrian Grand Prix'));
    expect(rb.slice(1)).toEqual(won((w) => w.constructorId === 'red_bull'));
  });

  it('"sprint" lists the sprint weekends', () => {
    expect(rounds('sprint')).toEqual(season.races.filter((r) => r.sprint).map((r) => r.round));
  });
});

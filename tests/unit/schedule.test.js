import { describe, it, expect } from 'vitest';
import { nextRace, raceState, FILTERS, podium, countdownParts } from '../../src/lib/schedule.js';
import { buildICS } from '../../src/lib/ics.js';
import { flag } from '../../src/lib/flags.js';

const race = (round, start, extra = {}) => ({
  round, name: `R${round} Grand Prix`, circuitName: 'Ring', locality: 'Town', country: 'UK', start,
  status: 'upcoming', sprint: false, results: [],
  sessions: [{ name: 'Practice 1', start: new Date(Date.parse(start) - 2 * 86400000).toISOString() }, { name: 'Qualifying', start: new Date(Date.parse(start) - 86400000).toISOString() }, { name: 'Race', start }],
  ...extra,
});

const races = [
  race(1, '2026-03-08T04:00:00Z', { status: 'completed', results: [{ pos: 2, driverId: 'b' }, { pos: 1, driverId: 'a' }, { pos: 3, driverId: 'c' }, { pos: 4, driverId: 'd' }] }),
  race(2, '2026-03-15T07:00:00Z', { sprint: true }),
  race(3, '2026-03-29T05:00:00Z'),
];

describe('schedule helpers', () => {
  it('finds the next race, keeping it during the race', () => {
    expect(nextRace(races, new Date('2026-03-10T00:00:00Z')).round).toBe(2);
    expect(nextRace(races, new Date('2026-03-15T08:00:00Z')).round).toBe(2);
    expect(nextRace(races, new Date('2026-03-15T11:00:00Z')).round).toBe(3);
    expect(nextRace(races, new Date('2026-12-31T00:00:00Z'))).toBeNull();
  });
  it('labels weekend state', () => {
    expect(raceState(races[1], new Date('2026-03-14T00:00:00Z'))).toBe('live');
    expect(raceState(races[2], new Date('2026-03-14T00:00:00Z'))).toBe('upcoming');
  });
  it('filters', () => {
    expect(races.filter(FILTERS.sprint).map((r) => r.round)).toEqual([2]);
    expect(races.filter(FILTERS.completed).map((r) => r.round)).toEqual([1]);
    expect(races.filter(FILTERS.upcoming).map((r) => r.round)).toEqual([2, 3]);
  });
  it('sorts the podium', () => {
    expect(podium(races[0]).map((r) => r.driverId)).toEqual(['a', 'b', 'c']);
  });
  it('splits countdowns and clamps at zero', () => {
    expect(countdownParts(90061000)).toEqual({ days: 1, hours: 1, minutes: 1, seconds: 1 });
    expect(countdownParts(-5)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
  it('makes flag emoji', () => {
    expect(flag('UK')).toBe('🇬🇧');
    expect(flag('Atlantis')).toBe('🏁');
  });
});

describe('buildICS', () => {
  const ics = buildICS(races, { now: new Date('2026-01-01T00:00:00Z') });
  it('is a valid calendar with CRLF lines', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
  it('includes only qualifying/sprint/race by default', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(6);
    expect(ics).not.toContain('Practice 1');
    expect(buildICS(races, { sessions: 'all' }).match(/BEGIN:VEVENT/g)).toHaveLength(9);
  });
  it('uses UTC times and 2h race duration', () => {
    expect(ics).toContain('DTSTART:20260308T040000Z');
    expect(ics).toContain('DTEND:20260308T060000Z');
  });
  it('escapes commas in location', () => {
    expect(ics).toContain('LOCATION:Ring\\, Town\\, UK');
  });
});

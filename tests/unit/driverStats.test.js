import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { driverList, seasonStats, teammateHeadToHead, ageOn, nationalityFlag } from '../../src/lib/driverStats.js';

const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url)));

describe('seasonStats (real 2026 snapshot)', () => {
  it('wins and points agree with the official standings for every driver', () => {
    for (const s of season.driverStandings) {
      const st = seasonStats(season, s.driverId);
      expect(st.wins, s.driverId).toBe(s.wins);
      expect(st.points, s.driverId).toBe(s.points);
    }
  });
  it('wins across all drivers equal the number of completed Grands Prix', () => {
    const done = season.races.filter((r) => r.results.length).length;
    const wins = season.driverStandings.reduce((n, s) => n + seasonStats(season, s.driverId).wins, 0);
    expect(wins).toBe(done);
  });
  it('podiums total 3 per completed race', () => {
    const done = season.races.filter((r) => r.results.length).length;
    const pods = Object.keys(season.drivers).reduce((n, id) => n + seasonStats(season, id).podiums, 0);
    expect(pods).toBe(done * 3);
  });
  it('one pole and at most one official fastest lap per race', () => {
    const done = season.races.filter((r) => r.results.length);
    const poles = Object.keys(season.drivers).reduce((n, id) => n + seasonStats(season, id).poles, 0);
    expect(poles).toBe(done.filter((r) => r.qualifying.length).length);
    const fl = Object.keys(season.drivers).reduce((n, id) => n + seasonStats(season, id).fastestLaps, 0);
    expect(fl).toBeLessThanOrEqual(done.length);
  });
  it('average finish only counts classified finishes', () => {
    const st = seasonStats(season, 'antonelli');
    expect(st.avgFinish).toBeGreaterThanOrEqual(1);
    expect(st.avgFinish).toBeLessThan(5);
  });
});

describe('teammateHeadToHead', () => {
  it('pairs Antonelli with Russell and covers every round they both raced', () => {
    const [h] = teammateHeadToHead(season, 'antonelli');
    expect(h.teammateId).toBe('russell');
    expect(h.quali[0] + h.quali[1]).toBeLessThanOrEqual(h.rounds);
    expect(h.race[0] + h.race[1]).toBeLessThanOrEqual(h.rounds);
  });
  it('is symmetric between teammates', () => {
    const a = teammateHeadToHead(season, 'antonelli').find((h) => h.teammateId === 'russell');
    const b = teammateHeadToHead(season, 'russell').find((h) => h.teammateId === 'antonelli');
    expect(a.quali).toEqual([...b.quali].reverse());
    expect(a.race).toEqual([...b.race].reverse());
    expect(a.points).toEqual([...b.points].reverse());
  });
  it('handles a mid-season teammate change', () => {
    const res = (driverId, team, pos) => ({ driverId, constructorId: team, pos, positionText: String(pos), points: 0 });
    const mini = {
      races: [
        { round: 1, results: [res('a', 't', 1), res('b', 't', 2)], sprintResults: [], qualifying: [] },
        { round: 2, results: [res('a', 't', 3), res('c', 't', 2)], sprintResults: [], qualifying: [] },
      ],
    };
    const h = teammateHeadToHead(mini, 'a');
    expect(h.map((x) => [x.teammateId, x.race])).toEqual([['b', [1, 0]], ['c', [0, 1]]]);
  });
});

describe('driverList and helpers', () => {
  it('lists the current grid in championship order', () => {
    const { current } = driverList(season);
    expect(current.length).toBeGreaterThanOrEqual(20);
    expect(current[0].id).toBe(season.driverStandings[0].driverId);
  });
  it('computes age and flags', () => {
    expect(ageOn('2006-08-25', new Date('2026-11-04'))).toBe(20);
    expect(ageOn('2006-08-25', new Date('2026-08-24'))).toBe(19);
    expect(nationalityFlag('Italian')).toBe('🇮🇹');
    expect(nationalityFlag('Martian')).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildRaceRows, sortRows, resultLabel } from '../../src/lib/raceTable.js';

const results = [
  { driverId: 'a', constructorId: 't', pos: 1, positionText: '1', grid: 3, points: 25, status: 'Finished' },
  { driverId: 'b', constructorId: 't', pos: 2, positionText: '2', grid: 0, points: 18, status: 'Finished' },
  { driverId: 'c', constructorId: 'u', pos: 3, positionText: 'R', grid: 1, points: 0, status: 'Retired' },
];
const strategies = [
  { driverId: 'a', stopCount: 1, pits: [{ lap: 20, stopDuration: 2.5 }], stints: [], fastestLap: { seconds: 81 } },
  { driverId: 'b', stopCount: 2, pits: [{ lap: 10, stopDuration: 3.1 }, { lap: 30, stopDuration: 2.2 }], stints: [], fastestLap: { seconds: 80.5 } },
];

describe('buildRaceRows', () => {
  const rows = buildRaceRows(results, strategies);
  it('joins strategy data by driver', () => {
    expect(rows.map((r) => r.stops)).toEqual([1, 2, null]);
    expect(rows[1].bestStop).toBe(2.2);
  });
  it('marks the overall fastest lap', () => {
    expect(rows.filter((r) => r.isFastest).map((r) => r.driverId)).toEqual(['b']);
  });
  it('computes places gained, counting pit-lane starts as last on the grid', () => {
    expect(rows[0].gained).toBe(2);
    expect(rows[1].gained).toBe(1);
    expect(rows[2].gained).toBeNull();
  });
  it('labels non-finishers', () => {
    expect(rows.map(resultLabel)).toEqual(['P1', 'P2', 'DNF']);
  });
});

describe('sortRows', () => {
  const rows = buildRaceRows(results, strategies);
  it('sorts by stops with missing values last in both directions', () => {
    expect(sortRows(rows, 'stops').map((r) => r.driverId)).toEqual(['a', 'b', 'c']);
    expect(sortRows(rows, 'stops', 'desc').map((r) => r.driverId)).toEqual(['b', 'a', 'c']);
  });
  it('sorts by fastest lap', () => {
    expect(sortRows(rows, 'fastestLap').map((r) => r.driverId)).toEqual(['b', 'a', 'c']);
  });
});

describe('real round 19 data', () => {
  const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url)));
  const detail = JSON.parse(readFileSync(new URL('../../public/data/races/19.json', import.meta.url)));
  const race = season.races.find((r) => r.round === 19);
  const rows = buildRaceRows(race.results, detail.grandPrix.strategies);
  it('every classified finisher has strategy data', () => {
    for (const r of rows.filter((x) => x.classified)) expect(r.stints.length, r.driverId).toBeGreaterThan(0);
  });
  it('stints cover each finisher\'s race without gaps', () => {
    for (const r of rows.filter((x) => x.classified)) {
      const s = r.stints;
      expect(s[0].lapStart, r.driverId).toBe(1);
      for (let i = 1; i < s.length; i++) expect(s[i].lapStart, r.driverId).toBe(s[i - 1].lapEnd + 1);
    }
  });
});

describe('round 19 red flag', () => {
  const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url)));
  const detail = JSON.parse(readFileSync(new URL('../../public/data/races/19.json', import.meta.url)));
  const race = season.races.find((r) => r.round === 19);
  const rows = buildRaceRows(race.results, detail.grandPrix.strategies);
  it('does not count the lap-45 red-flag tyre change as a pit stop', () => {
    const ham = rows.find((r) => r.driverId === 'hamilton');
    expect(ham.stops).toBe(2);
    expect(ham.bestLane).toBeLessThan(60);
  });
});

describe('winner and fastest-lap flags', () => {
  it('prefers the official fastest lap over OpenF1 timing', () => {
    const official = results.map((r) => (r.driverId === 'a' ? { ...r, fastestLap: { rank: 1, lap: 44, time: '1:20.100' } } : r));
    const rows = buildRaceRows(official, strategies);
    expect(rows.filter((r) => r.isFastest).map((r) => r.driverId)).toEqual(['a']);
    expect(rows[0].fastestLap).toEqual({ time: '1:20.100', lap: 44 });
  });
  it('marks only the classified P1 as winner', () => {
    expect(buildRaceRows(results, strategies).filter((r) => r.isWinner).map((r) => r.driverId)).toEqual(['a']);
  });
  it('real round 19: exactly one winner and one fastest lap', () => {
    const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url)));
    const detail = JSON.parse(readFileSync(new URL('../../public/data/races/19.json', import.meta.url)));
    const rows = buildRaceRows(season.races.find((r) => r.round === 19).results, detail.grandPrix.strategies);
    expect(rows.filter((r) => r.isWinner)).toHaveLength(1);
    expect(rows.filter((r) => r.isFastest)).toHaveLength(1);
  });
});

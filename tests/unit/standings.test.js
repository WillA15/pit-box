import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { computeStandingsHistory, positionChanges, pointsRemaining } from '../../src/lib/standingsHistory.js';

const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url)));

describe('computeStandingsHistory (real 2026 snapshot)', () => {
  const h = computeStandingsHistory(season.races);
  const last = h.rounds.at(-1);

  it('covers every round with results', () => {
    expect(last).toBe(season.standingsRound);
  });
  it('rebuilt driver points match the official standings', () => {
    const rebuilt = Object.fromEntries(h.drivers[last].map((r) => [r.id, r.points]));
    for (const s of season.driverStandings) expect(rebuilt[s.driverId] ?? 0, s.driverId).toBe(s.points);
  });
  it('rebuilt driver order matches the official standings', () => {
    expect(h.drivers[last].map((r) => r.id).slice(0, 10)).toEqual(season.driverStandings.map((s) => s.driverId).slice(0, 10));
  });
  it('rebuilt constructor points match the official standings', () => {
    const rebuilt = Object.fromEntries(h.constructors[last].map((r) => [r.id, r.points]));
    for (const s of season.constructorStandings) expect(rebuilt[s.constructorId] ?? 0, s.constructorId).toBe(s.points);
  });
  it('earlier rounds are not mutated by later ones', () => {
    const first = h.rounds[0];
    const total = h.drivers[first].reduce((n, r) => n + r.points, 0);
    expect(total).toBeLessThan(h.drivers[last].reduce((n, r) => n + r.points, 0));
  });
});

describe('tiebreaks and changes', () => {
  const res = (driverId, pos, points, constructorId = 't') => ({ driverId, pos, positionText: String(pos), points, constructorId });
  const races = [
    { round: 1, results: [res('a', 1, 25), res('b', 2, 18)], sprintResults: [] },
    { round: 2, results: [res('b', 1, 25), res('a', 2, 18)], sprintResults: [] },
    { round: 3, results: [res('b', 3, 15), res('a', 3, 15, 'x')], sprintResults: [] },
  ];
  it('breaks a points tie on countback', () => {
    // After round 2 both have 43 pts and 1 win; still tied on 2nds; stable order.
    const h = computeStandingsHistory([
      races[0],
      { round: 2, results: [res('b', 1, 26), res('a', 3, 17)], sprintResults: [] },
    ]);
    // a: 25+17=42, b: 18+26=44
    expect(h.drivers[2].map((r) => r.id)).toEqual(['b', 'a']);
  });
  it('reports position changes vs previous round', () => {
    const h = computeStandingsHistory(races.slice(0, 2));
    // Round 2: both 43 pts, one win each, one 2nd each -> tie; b gained a place or held.
    const ch = positionChanges(h, 'drivers', 2);
    expect(Object.keys(ch).sort()).toEqual(['a', 'b']);
  });
  it('does not count DNFs (non-numeric positionText) as finishes', () => {
    const h = computeStandingsHistory([{ round: 1, results: [{ ...res('a', 20, 0), positionText: 'R' }], sprintResults: [] }]);
    expect(h.drivers[1][0].finishes).toEqual([]);
  });
});

describe('pointsRemaining', () => {
  it('adds 25 per GP and 8 per sprint after the round', () => {
    expect(pointsRemaining([{ round: 1 }, { round: 2, sprint: true }, { round: 3 }], 1)).toBe(58);
  });
});

import { interpolateStandings, championClinch } from '../../src/lib/standingsHistory.js';

describe('interpolateStandings', () => {
  const res = (driverId, pos, points) => ({ driverId, pos, positionText: String(pos), points, constructorId: 't' });
  const h = computeStandingsHistory([
    { round: 1, results: [res('a', 1, 25), res('b', 2, 18)], sprintResults: [] },
    { round: 2, results: [res('b', 1, 25), res('a', 10, 1)], sprintResults: [] },
  ]);
  it('matches real rounds at whole numbers', () => {
    expect(interpolateStandings(h, 'drivers', 0).map((r) => [r.id, r.points])).toEqual([['a', 25], ['b', 18]]);
    expect(interpolateStandings(h, 'drivers', 1).map((r) => [r.id, r.points])).toEqual([['b', 43], ['a', 26]]);
  });
  it('blends points between rounds and re-ranks as totals cross', () => {
    // a: 25 -> 26, b: 18 -> 43. They cross when 25 + f = 18 + 25f, f ≈ 0.29.
    expect(interpolateStandings(h, 'drivers', 0.2)[0].id).toBe('a');
    expect(interpolateStandings(h, 'drivers', 0.4)[0].id).toBe('b');
    expect(interpolateStandings(h, 'drivers', 0.5).find((r) => r.id === 'b').points).toBeCloseTo(30.5);
  });
  it('clamps out-of-range positions', () => {
    expect(interpolateStandings(h, 'drivers', 99)[0].points).toBe(43);
    expect(interpolateStandings(h, 'drivers', -1)[0].points).toBe(25);
  });
});

describe('championClinch', () => {
  it('finds the 2026 drivers title clinched by Antonelli at round 19 (real snapshot)', () => {
    const h = computeStandingsHistory(season.races);
    expect(championClinch(h, season.races, 'drivers')).toEqual({ id: 'antonelli', round: 19 });
  });
  it('does not crown a constructors champion yet (real snapshot)', () => {
    const h = computeStandingsHistory(season.races);
    expect(championClinch(h, season.races, 'constructors')).toBeNull();
  });
  it('needs a lead strictly bigger than the points left', () => {
    const res = (driverId, pos, points) => ({ driverId, pos, positionText: String(pos), points, constructorId: 't' });
    const races = [
      { round: 1, results: [res('a', 1, 25), res('b', 2, 0)], sprintResults: [] },
      { round: 2, results: [], sprintResults: [] },
    ];
    const h = computeStandingsHistory(races);
    // Lead 25 = 25 left: b could still tie, so not clinched.
    expect(championClinch(h, races, 'drivers')).toBeNull();
  });
  it('counts sprint and team maximums', () => {
    expect(pointsRemaining([{ round: 2, sprint: true }], 1, 'constructors')).toBe(58);
  });
});

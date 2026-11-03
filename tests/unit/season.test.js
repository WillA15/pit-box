import { describe, it, expect } from 'vitest';
import { assembleSeason, normalizeSchedule } from '../../src/lib/f1/buildSeason.js';
import { matchSession, mapDriverIds } from '../../src/lib/f1/buildRace.js';

const circuit = { circuitId: 'x', circuitName: 'X Ring', Location: { lat: '1', long: '2', locality: 'Town', country: 'Land' } };
const driver = (id, code, family) => ({ driverId: id, code, givenName: 'A', familyName: family, permanentNumber: '7' });
const row = (pos, d, team, points) => ({
  position: String(pos), positionText: String(pos), points: String(points), grid: '1', laps: '50', status: 'Finished',
  Driver: d, Constructor: { constructorId: team, name: team.toUpperCase(), nationality: 'X' },
});

describe('normalizeSchedule', () => {
  it('orders sessions and flags sprints', () => {
    const r = normalizeSchedule({
      round: '2', raceName: 'Test GP', date: '2026-03-15', time: '07:00:00Z', Circuit: circuit,
      FirstPractice: { date: '2026-03-13', time: '03:30:00Z' },
      SprintQualifying: { date: '2026-03-13', time: '07:30:00Z' },
      Sprint: { date: '2026-03-14', time: '03:00:00Z' },
      Qualifying: { date: '2026-03-14', time: '07:00:00Z' },
    });
    expect(r.sprint).toBe(true);
    expect(r.sessions.map((s) => s.name)).toEqual(['Practice 1', 'Sprint Qualifying', 'Sprint', 'Qualifying', 'Race']);
  });
});

describe('assembleSeason', () => {
  const a = driver('alpha', 'ALP', 'Alpha');
  const b = driver('bravo', 'BRA', 'Bravo');
  const schedule = [
    { round: '1', raceName: 'One GP', date: '2026-03-01', time: '05:00:00Z', Circuit: circuit },
    { round: '2', raceName: 'Two GP', date: '2026-03-08', time: '05:00:00Z', Circuit: circuit },
  ];
  // Bravo switches team between rounds 1 and 2 (in this made-up example).
  const results = [{ round: '1', Results: [row(1, a, 'red', 25), row(2, b, 'blue', 18)] }];
  const season = assembleSeason({
    season: '2026', schedule, results, sprints: [], qualifying: [],
    driverStandings: { round: 1, rows: [] }, constructorStandings: { round: 1, rows: [] },
    generatedAt: 'now',
  });

  it('marks rounds completed only when results exist', () => {
    expect(season.races.map((r) => r.status)).toEqual(['completed', 'upcoming']);
  });
  it('keeps each driver on their latest team', () => {
    const later = assembleSeason({
      season: '2026', schedule,
      results: [...results, { round: '2', Results: [row(1, b, 'red', 25)] }],
      sprints: [], qualifying: [], driverStandings: { round: 2, rows: [] }, constructorStandings: { round: 2, rows: [] },
    });
    expect(later.drivers.bravo.constructorId).toBe('red');
  });
});

describe('matchSession', () => {
  const sessions = [
    { session_name: 'Race', session_key: 1, date_start: '2026-04-12T15:00:00+00:00' },
    { session_name: 'Race', session_key: 2, date_start: '2026-10-04T08:00:00+00:00' },
  ];
  it('matches by closest date within two days', () => {
    expect(matchSession(sessions, 'Race', '2026-10-04T08:00:00Z').session_key).toBe(2);
  });
  it('ignores sessions far from the scheduled date (e.g. cancelled rounds)', () => {
    expect(matchSession(sessions, 'Race', '2026-05-01T08:00:00Z')).toBeNull();
  });
});

describe('mapDriverIds', () => {
  it('maps by code, falling back to surname', () => {
    const season = { alpha: { id: 'alpha', code: 'ALP', familyName: 'Alpha' }, bravo: { id: 'bravo', code: 'BRV', familyName: 'Bravo' } };
    expect(mapDriverIds([{ driver_number: 7, name_acronym: 'ALP' }, { driver_number: 9, name_acronym: 'BRA', last_name: 'Bravo' }], season))
      .toEqual({ 7: 'alpha', 9: 'bravo' });
  });
});

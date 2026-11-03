import { jolpicaRaces, jolpicaStandings } from './jolpica.js';

const SESSION_KEYS = [
  ['FirstPractice', 'Practice 1'],
  ['SecondPractice', 'Practice 2'],
  ['ThirdPractice', 'Practice 3'],
  ['SprintQualifying', 'Sprint Qualifying'],
  ['SprintShootout', 'Sprint Qualifying'],
  ['Sprint', 'Sprint'],
  ['Qualifying', 'Qualifying'],
];

const iso = (s) => (s?.date ? `${s.date}T${s.time ?? '00:00:00Z'}` : null);
const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v));

export function normalizeResult(r) {
  return {
    pos: num(r.position),
    positionText: r.positionText,
    driverId: r.Driver.driverId,
    constructorId: r.Constructor.constructorId,
    grid: num(r.grid),
    laps: num(r.laps),
    status: r.status,
    points: Number(r.points ?? 0),
    time: r.Time?.time ?? null,
    fastestLap: r.FastestLap ? { rank: num(r.FastestLap.rank), lap: num(r.FastestLap.lap), time: r.FastestLap.Time?.time ?? null } : null,
  };
}

function normalizeQuali(q) {
  return {
    pos: num(q.position),
    driverId: q.Driver.driverId,
    constructorId: q.Constructor.constructorId,
    q1: q.Q1 ?? null,
    q2: q.Q2 ?? null,
    q3: q.Q3 ?? null,
  };
}

export function normalizeSchedule(race) {
  const sessions = [];
  for (const [key, name] of SESSION_KEYS) {
    if (race[key] && !sessions.some((s) => s.name === name)) sessions.push({ name, start: iso(race[key]) });
  }
  sessions.push({ name: 'Race', start: iso(race) });
  sessions.sort((a, b) => a.start.localeCompare(b.start));
  return {
    round: Number(race.round),
    name: race.raceName,
    circuitId: race.Circuit.circuitId,
    circuitName: race.Circuit.circuitName,
    locality: race.Circuit.Location.locality,
    country: race.Circuit.Location.country,
    lat: Number(race.Circuit.Location.lat),
    long: Number(race.Circuit.Location.long),
    date: race.date,
    start: iso(race),
    sprint: Boolean(race.Sprint),
    sessions,
  };
}

function driverFrom(d) {
  return {
    id: d.driverId,
    code: d.code ?? d.familyName.slice(0, 3).toUpperCase(),
    number: num(d.permanentNumber),
    givenName: d.givenName,
    familyName: d.familyName,
    nationality: d.nationality,
    dob: d.dateOfBirth,
    url: d.url,
  };
}

/** Build the whole-season document from raw Jolpica responses (pure, for testing). */
export function assembleSeason({ season, schedule, results, sprints, qualifying, driverStandings, constructorStandings, generatedAt }) {
  const drivers = {};
  const constructors = {};
  const resultsByRound = new Map(results.map((r) => [Number(r.round), r]));
  const sprintByRound = new Map(sprints.map((r) => [Number(r.round), r]));
  const qualiByRound = new Map(qualifying.map((r) => [Number(r.round), r]));

  const note = (row) => {
    drivers[row.Driver.driverId] = { ...driverFrom(row.Driver), constructorId: row.Constructor.constructorId };
    constructors[row.Constructor.constructorId] = {
      id: row.Constructor.constructorId,
      name: row.Constructor.name,
      nationality: row.Constructor.nationality,
    };
  };

  const races = schedule.map((raw) => {
    const race = normalizeSchedule(raw);
    // Visit rows in round order so each driver's constructorId ends up as their latest team.
    const res = resultsByRound.get(race.round)?.Results ?? [];
    const spr = sprintByRound.get(race.round)?.SprintResults ?? [];
    const qua = qualiByRound.get(race.round)?.QualifyingResults ?? [];
    [...qua, ...spr, ...res].forEach(note);
    return {
      ...race,
      status: res.length ? 'completed' : 'upcoming',
      results: res.map(normalizeResult),
      sprintResults: spr.map(normalizeResult),
      qualifying: qua.map(normalizeQuali),
    };
  });

  return {
    season: Number(season),
    generatedAt,
    standingsRound: driverStandings.round,
    races,
    drivers,
    constructors,
    driverStandings: driverStandings.rows.map((s) => ({
      pos: num(s.position),
      driverId: s.Driver.driverId,
      constructorId: s.Constructors.at(-1)?.constructorId ?? drivers[s.Driver.driverId]?.constructorId,
      points: Number(s.points),
      wins: Number(s.wins),
    })),
    constructorStandings: constructorStandings.rows.map((s) => ({
      pos: num(s.position),
      constructorId: s.Constructor.constructorId,
      points: Number(s.points),
      wins: Number(s.wins),
    })),
  };
}

/** Fetch everything live from Jolpica and assemble the season document. */
export async function buildSeason(season = 2026, opts = {}) {
  const schedule = (await jolpicaRaces(`${season}/races`, null, opts)).filter(Boolean);
  const results = await jolpicaRaces(`${season}/results`, 'Results', opts);
  const sprints = await jolpicaRaces(`${season}/sprint`, 'SprintResults', opts);
  const qualifying = await jolpicaRaces(`${season}/qualifying`, 'QualifyingResults', opts);
  const driverStandings = await jolpicaStandings(season, 'driver', opts);
  const constructorStandings = await jolpicaStandings(season, 'constructor', opts);
  return assembleSeason({
    season,
    schedule,
    results,
    sprints,
    qualifying,
    driverStandings,
    constructorStandings,
    generatedAt: new Date().toISOString(),
  });
}

import { getJSON } from './http.js';
import { buildStrategies, summarizeRaceControl } from './stints.js';

export const OPENF1 = 'https://api.openf1.org/v1';

const DAY = 86400000;

/** Pick the OpenF1 session whose start is closest to the Jolpica date (within 2 days). */
export function matchSession(sessions, sessionName, isoStart) {
  if (!isoStart) return null;
  const target = Date.parse(isoStart);
  let best = null;
  for (const s of sessions) {
    if (s.session_name !== sessionName) continue;
    const diff = Math.abs(Date.parse(s.date_start) - target);
    if (diff <= 2 * DAY && (!best || diff < best.diff)) best = { session: s, diff };
  }
  return best?.session ?? null;
}

/** Map OpenF1 driver numbers to Jolpica driverIds using 3-letter codes, then surnames. */
export function mapDriverIds(openf1Drivers, seasonDrivers) {
  const list = Object.values(seasonDrivers);
  const map = {};
  for (const d of openf1Drivers) {
    const hit =
      list.find((s) => s.code === d.name_acronym) ??
      list.find((s) => s.familyName?.toLowerCase() === d.last_name?.toLowerCase());
    if (hit) map[d.driver_number] = hit.id;
  }
  return map;
}

async function sessionDetail(sessionKey, seasonDrivers, getJSONImpl) {
  const q = `session_key=${sessionKey}`;
  const drivers = await getJSONImpl(`${OPENF1}/drivers?${q}`);
  const stints = await getJSONImpl(`${OPENF1}/stints?${q}`);
  const pits = await getJSONImpl(`${OPENF1}/pit?${q}`);
  const laps = await getJSONImpl(`${OPENF1}/laps?${q}`);
  const raceControl = await getJSONImpl(`${OPENF1}/race_control?${q}`);
  const ids = mapDriverIds(drivers, seasonDrivers);
  const strategies = buildStrategies({ stints, pits, laps, drivers }).map((s) => {
    const d = drivers.find((x) => x.driver_number === s.number);
    return {
      ...s,
      driverId: ids[s.number] ?? null,
      code: d?.name_acronym ?? String(s.number),
      team: d?.team_name ?? null,
      color: d?.team_colour ? `#${d.team_colour}` : null,
    };
  });
  const fastest = strategies
    .filter((s) => s.fastestLap)
    .sort((a, b) => a.fastestLap.seconds - b.fastestLap.seconds)[0];
  return {
    sessionKey,
    totalLaps: Math.max(0, ...strategies.map((s) => s.lapsCompleted)),
    strategies,
    fastest: fastest ? { driverId: fastest.driverId, code: fastest.code, ...fastest.fastestLap } : null,
    raceControl: summarizeRaceControl(raceControl),
    totalStops: strategies.reduce((n, s) => n + s.stopCount, 0),
  };
}

let sessionsCache = null;

/** Build strategy detail (Grand Prix + Sprint) for one round of the season document. */
export async function buildRace(season, round, { getJSONImpl = getJSON } = {}) {
  const race = season.races.find((r) => r.round === Number(round));
  if (!race) throw new Error(`Unknown round ${round}`);
  const out = { round: race.round, generatedAt: new Date().toISOString(), grandPrix: null, sprint: null };
  if (race.status !== 'completed' && !race.sprintResults.length) return out;

  sessionsCache ??= await getJSONImpl(`${OPENF1}/sessions?year=${season.season}`);
  const gp = matchSession(sessionsCache, 'Race', race.start);
  if (gp && race.status === 'completed') out.grandPrix = await sessionDetail(gp.session_key, season.drivers, getJSONImpl);
  if (race.sprint && race.sprintResults.length) {
    const sprintStart = race.sessions.find((s) => s.name === 'Sprint')?.start;
    const sp = matchSession(sessionsCache, 'Sprint', sprintStart);
    if (sp) out.sprint = await sessionDetail(sp.session_key, season.drivers, getJSONImpl);
  }
  return out;
}

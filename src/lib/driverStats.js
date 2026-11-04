// Season statistics for Driver Spotlight, computed from the season document (pure, testable).

const CLASSIFIED = /^\d+$/;
const isClassified = (r) => CLASSIFIED.test(r?.positionText ?? '');
// Did not start / withdrawn: not counted as a DNF.
const didNotStart = (r) => r.positionText === 'W' || r.positionText === 'F' || /did not start|withdrew/i.test(r.status ?? '');

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Drivers in championship order, split into this weekend's grid and anyone else who raced in 2026. */
export function driverList(season) {
  const latest = [...season.races].reverse().find((r) => r.results.length);
  const onGrid = new Set(latest?.results.map((r) => r.driverId) ?? []);
  const standing = new Map(season.driverStandings.map((s) => [s.driverId, s]));
  const all = Object.values(season.drivers)
    .filter((d) => season.races.some((r) => r.results.some((x) => x.driverId === d.id) || r.sprintResults.some((x) => x.driverId === d.id)))
    .map((d) => ({ ...d, standing: standing.get(d.id) ?? null }))
    .sort((a, b) => (a.standing?.pos ?? 99) - (b.standing?.pos ?? 99) || a.familyName.localeCompare(b.familyName));
  return { current: all.filter((d) => onGrid.has(d.id)), others: all.filter((d) => !onGrid.has(d.id)) };
}

export function seasonStats(season, driverId) {
  const standing = season.driverStandings.find((s) => s.driverId === driverId) ?? null;
  const rows = [];
  for (const race of season.races) {
    const r = race.results.find((x) => x.driverId === driverId);
    const sp = race.sprintResults.find((x) => x.driverId === driverId);
    const q = race.qualifying.find((x) => x.driverId === driverId);
    if (!r && !sp) continue;
    rows.push({ round: race.round, name: race.name, country: race.country, result: r ?? null, sprint: sp ?? null, quali: q ?? null });
  }
  const gp = rows.map((x) => x.result).filter(Boolean);
  const finishes = gp.filter(isClassified);
  return {
    position: standing?.pos ?? null,
    points: standing?.points ?? rows.reduce((n, x) => n + (x.result?.points ?? 0) + (x.sprint?.points ?? 0), 0),
    starts: gp.filter((r) => !didNotStart(r)).length,
    wins: gp.filter((r) => isClassified(r) && r.pos === 1).length,
    podiums: gp.filter((r) => isClassified(r) && r.pos <= 3).length,
    poles: rows.filter((x) => x.quali?.pos === 1).length,
    fastestLaps: gp.filter((r) => r.fastestLap?.rank === 1).length,
    dnfs: gp.filter((r) => !isClassified(r) && !didNotStart(r)).length,
    avgFinish: avg(finishes.map((r) => r.pos)),
    avgGrid: avg(gp.filter((r) => r.grid > 0).map((r) => r.grid)),
    bestFinish: finishes.length ? Math.min(...finishes.map((r) => r.pos)) : null,
    sprintWins: rows.filter((x) => x.sprint && isClassified(x.sprint) && x.sprint.pos === 1).length,
    sprintPoints: rows.reduce((n, x) => n + (x.sprint?.points ?? 0), 0),
    rounds: rows,
  };
}

/**
 * Head-to-head with teammates, round by round. A teammate is whoever else drove for the same
 * constructor in that race, so mid-season driver changes are handled. Returns one entry per teammate.
 *   quali: better qualifying position (both must have qualified)
 *   race:  better finish; if only one was classified, they win; if neither, the round is skipped
 */
export function teammateHeadToHead(season, driverId) {
  const byMate = new Map();
  const entry = (id) => {
    if (!byMate.has(id)) byMate.set(id, { teammateId: id, rounds: 0, quali: [0, 0], race: [0, 0], points: [0, 0] });
    return byMate.get(id);
  };
  for (const race of season.races) {
    const me = race.results.find((x) => x.driverId === driverId) ?? race.sprintResults.find((x) => x.driverId === driverId);
    if (!me) continue;
    const team = me.constructorId;
    const mateRow = race.results.find((x) => x.constructorId === team && x.driverId !== driverId)
      ?? race.sprintResults.find((x) => x.constructorId === team && x.driverId !== driverId);
    if (!mateRow) continue;
    const e = entry(mateRow.driverId);
    e.rounds++;

    const myQ = race.qualifying.find((x) => x.driverId === driverId)?.pos;
    const theirQ = race.qualifying.find((x) => x.driverId === mateRow.driverId)?.pos;
    if (myQ && theirQ) e.quali[myQ < theirQ ? 0 : 1]++;

    const myR = race.results.find((x) => x.driverId === driverId);
    const theirR = race.results.find((x) => x.driverId === mateRow.driverId);
    if (myR && theirR) {
      const a = isClassified(myR);
      const b = isClassified(theirR);
      if (a && b) e.race[myR.pos < theirR.pos ? 0 : 1]++;
      else if (a !== b) e.race[a ? 0 : 1]++;
    }
    const pts = (id) => (race.results.find((x) => x.driverId === id)?.points ?? 0) + (race.sprintResults.find((x) => x.driverId === id)?.points ?? 0);
    e.points[0] += pts(driverId);
    e.points[1] += pts(mateRow.driverId);
  }
  return [...byMate.values()].sort((a, b) => b.rounds - a.rounds);
}

/** Driver age in whole years on a date. */
export function ageOn(dob, date = new Date()) {
  if (!dob) return null;
  const b = new Date(dob);
  let age = date.getUTCFullYear() - b.getUTCFullYear();
  const m = date.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && date.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

const DEMONYM_ISO = {
  Argentine: 'AR', Argentinian: 'AR', Australian: 'AU', Austrian: 'AT', Belgian: 'BE', Brazilian: 'BR', British: 'GB',
  Canadian: 'CA', Chinese: 'CN', Danish: 'DK', Dutch: 'NL', Finnish: 'FI', French: 'FR', German: 'DE', Italian: 'IT',
  Japanese: 'JP', Mexican: 'MX', Monegasque: 'MC', 'New Zealander': 'NZ', Polish: 'PL', Spanish: 'ES', Swedish: 'SE',
  Swiss: 'CH', Thai: 'TH', American: 'US', Estonian: 'EE', Israeli: 'IL',
};
export function nationalityFlag(nationality) {
  const iso = DEMONYM_ISO[nationality];
  return iso ? String.fromCodePoint(...[...iso].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '';
}

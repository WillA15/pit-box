// Join Jolpica results with OpenF1 strategy data into one row per driver (pure, testable).

const CLASSIFIED = /^\d+$/;

/**
 * @param results     season race.results or race.sprintResults
 * @param strategies  race detail grandPrix/sprint .strategies (may be missing)
 */
export function buildRaceRows(results, strategies = []) {
  const byId = new Map(strategies.filter((s) => s.driverId).map((s) => [s.driverId, s]));
  const fastestSec = Math.min(...strategies.map((s) => s.fastestLap?.seconds ?? Infinity));
  // The official fastest lap (Jolpica rank 1) wins; OpenF1 timing is the fallback.
  const officialFastest = results.find((r) => r.fastestLap?.rank === 1);
  return results.map((r) => {
    const s = byId.get(r.driverId);
    const classified = CLASSIFIED.test(r.positionText ?? '');
    const realPits = (s?.pits ?? []).filter((p) => !p.suspended && !p.driveThrough && !(p.laneDuration > 120));
    const stopTimes = realPits.map((p) => p.stopDuration).filter((x) => x != null);
    const laneTimes = realPits.map((p) => p.laneDuration).filter((x) => x != null);
    // Grid 0 = pit-lane start; treat as starting last for positions gained.
    const grid = r.grid === 0 ? results.length : r.grid;
    return {
      driverId: r.driverId,
      constructorId: r.constructorId,
      pos: r.pos,
      positionText: r.positionText,
      classified,
      status: r.status,
      grid: r.grid,
      pitLaneStart: r.grid === 0,
      gained: classified && grid ? grid - r.pos : null,
      points: r.points,
      time: r.time,
      stints: s?.stints ?? [],
      pits: s?.pits ?? [],
      // Older snapshots counted red-flag tyre changes as stops; count real stops here.
      stops: s ? realPits.length : null,
      bestStop: stopTimes.length ? Math.min(...stopTimes) : null,
      bestLane: laneTimes.length ? Math.min(...laneTimes) : null,
      fastestLap: officialFastest
        ? r.fastestLap?.time ? { time: r.fastestLap.time, lap: r.fastestLap.lap } : s?.fastestLap ?? null
        : s?.fastestLap ?? null,
      isFastest: officialFastest
        ? officialFastest.driverId === r.driverId
        : Boolean(s?.fastestLap && s.fastestLap.seconds === fastestSec),
      isWinner: classified && r.pos === 1,
      lapsByCompound: s?.lapsByCompound ?? {},
    };
  });
}

/** Sort keys. Missing values always sort last, whichever direction. */
export const SORTS = {
  pos: (r) => r.pos,
  grid: (r) => (r.pitLaneStart ? 99 : r.grid),
  gained: (r) => (r.gained == null ? null : -r.gained),
  stops: (r) => r.stops,
  bestStop: (r) => r.bestStop,
  bestLane: (r) => r.bestLane,
  fastestLap: (r) => r.fastestLap?.seconds ?? null,
  points: (r) => -r.points,
};

export function sortRows(rows, key, dir = 'asc') {
  const get = SORTS[key] ?? SORTS.pos;
  const sign = dir === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va == null && vb == null) return a.pos - b.pos;
    if (va == null) return 1;
    if (vb == null) return -1;
    return (va - vb) * sign || a.pos - b.pos;
  });
}

export function resultLabel(row) {
  if (row.classified) return `P${row.pos}`;
  if (row.positionText === 'D') return 'DSQ';
  if (row.positionText === 'W' || row.positionText === 'F') return 'DNS';
  return 'DNF';
}

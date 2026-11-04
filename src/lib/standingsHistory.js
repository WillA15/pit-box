// Rebuild the championship after every round from race + sprint results.
// Ties use countback (most wins, then most 2nds, ...) on Grand Prix finishes, like the FIA rules.

function rank(rows) {
  return rows
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const len = Math.max(a.finishes.length, b.finishes.length);
      for (let i = 0; i < len; i++) {
        const d = (b.finishes[i] ?? 0) - (a.finishes[i] ?? 0);
        if (d) return d;
      }
      return 0;
    })
    .map((r, i) => ({ ...r, pos: i + 1 }));
}

/**
 * @returns {{ rounds: number[], drivers: Record<number, Row[]>, constructors: Record<number, Row[]> }}
 *   where Row = { id, points, wins, pos, finishes, constructorId? }
 */
export function computeStandingsHistory(races) {
  const driverTotals = new Map();
  const teamTotals = new Map();
  const out = { rounds: [], drivers: {}, constructors: {} };

  const bump = (map, id, extra) => {
    if (!map.has(id)) map.set(id, { id, points: 0, wins: 0, finishes: [], ...extra });
    const row = map.get(id);
    Object.assign(row, extra);
    return row;
  };
  const addFinish = (row, pos) => {
    if (!pos) return;
    while (row.finishes.length < pos) row.finishes.push(0);
    row.finishes[pos - 1]++;
  };

  for (const race of [...races].sort((a, b) => a.round - b.round)) {
    if (!race.results.length && !race.sprintResults.length) continue;
    for (const r of race.sprintResults) {
      bump(driverTotals, r.driverId, { constructorId: r.constructorId }).points += r.points;
      bump(teamTotals, r.constructorId).points += r.points;
    }
    for (const r of race.results) {
      const d = bump(driverTotals, r.driverId, { constructorId: r.constructorId });
      const t = bump(teamTotals, r.constructorId);
      d.points += r.points;
      t.points += r.points;
      const classified = /^\d+$/.test(r.positionText ?? '') ? r.pos : null;
      if (classified === 1) { d.wins++; t.wins++; }
      addFinish(d, classified);
      addFinish(t, classified);
    }
    // Store copies so later rounds don't mutate earlier snapshots.
    const snap = (map) => rank([...map.values()].map((r) => ({ ...r, finishes: [...r.finishes] })));
    out.rounds.push(race.round);
    out.drivers[race.round] = snap(driverTotals);
    out.constructors[race.round] = snap(teamTotals);
  }
  return out;
}

/** Positions gained (+) or lost (-) since the previous round, keyed by id. */
export function positionChanges(history, kind, round) {
  const i = history.rounds.indexOf(round);
  if (i <= 0) return {};
  const prev = new Map(history[kind][history.rounds[i - 1]].map((r) => [r.id, r.pos]));
  const out = {};
  for (const r of history[kind][round]) out[r.id] = prev.has(r.id) ? prev.get(r.id) - r.pos : 0;
  return out;
}

// Most points one driver / one team can score in a weekend (2026: no fastest-lap point).
const MAX_POINTS = {
  drivers: { gp: 25, sprint: 8 },
  constructors: { gp: 25 + 18, sprint: 8 + 7 },
};

/** Points still on offer after a round, for one driver (default) or one team. */
export function pointsRemaining(races, afterRound, kind = 'drivers') {
  const max = MAX_POINTS[kind];
  return races
    .filter((r) => r.round > afterRound)
    .reduce((n, r) => n + max.gp + (r.sprint ? max.sprint : 0), 0);
}

/**
 * The first round after which the leader can no longer be caught: their lead over
 * second place is bigger than the points left. Returns { id, round } or null.
 * (Strictly greater, so a possible tie on points never counts as clinched.)
 */
export function championClinch(history, races, kind) {
  for (const round of history.rounds) {
    const [first, second] = history[kind][round];
    if (!first) continue;
    const lead = first.points - (second?.points ?? 0);
    if (lead > pointsRemaining(races, round, kind)) return { id: first.id, round };
  }
  return null;
}

/**
 * Standings at a fractional position t along history.rounds (0 = first round, 1.5 = halfway
 * between the 2nd and 3rd rounds). Points are linearly interpolated and rows re-ranked, so
 * drivers overtake each other smoothly as their totals cross.
 */
export function interpolateStandings(history, kind, t) {
  const n = history.rounds.length;
  if (!n) return [];
  const clamped = Math.min(Math.max(t, 0), n - 1);
  const i = Math.floor(clamped);
  const frac = clamped - i;
  const a = history[kind][history.rounds[i]];
  if (frac === 0 || i === n - 1) return a.map((r) => ({ ...r }));
  const b = history[kind][history.rounds[i + 1]];
  const aById = new Map(a.map((r) => [r.id, r]));
  const bOrder = new Map(b.map((r, k) => [r.id, k]));
  return b
    .map((rb) => {
      const ra = aById.get(rb.id);
      const from = ra?.points ?? 0;
      return {
        ...rb,
        points: from + (rb.points - from) * frac,
        wins: frac < 0.5 ? ra?.wins ?? 0 : rb.wins,
      };
    })
    // Tie (e.g. both on 0) -> keep the order they'll have after the next round.
    .sort((x, y) => y.points - x.points || bOrder.get(x.id) - bOrder.get(y.id))
    .map((r, k) => ({ ...r, pos: k + 1 }));
}

/**
 * The state of a title fight after the latest round: the leader, and for each rival how far
 * behind they are and the most they could still finish on. A rival is still "alive" only if
 * their maximum possible total beats the leader's current total.
 */
export function titleFight(history, races, kind, { rivals = 3 } = {}) {
  const round = history.rounds.at(-1);
  const rows = history[kind][round] ?? [];
  const remaining = pointsRemaining(races, round, kind);
  const [leader, ...rest] = rows;
  if (!leader) return null;
  const clinch = championClinch(history, races, kind);
  const racesLeft = races.filter((r) => r.round > round).length;
  return {
    round,
    remaining,
    racesLeft,
    decided: Boolean(clinch),
    clinchRound: clinch?.round ?? null,
    leader: { id: leader.id, points: leader.points },
    rivals: rest.slice(0, rivals).map((r) => ({
      id: r.id,
      points: r.points,
      gap: leader.points - r.points,
      maxPossible: r.points + remaining,
      alive: r.points + remaining > leader.points,
    })),
  };
}

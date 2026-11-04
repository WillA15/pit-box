import { getJSON } from './http.js';
import { JOLPICA } from './jolpica.js';
import { OPENF1, matchSession } from './buildRace.js';

/**
 * Hand-entered circuit facts (the APIs don't provide these): length in km and number of corners.
 * `layoutSince` is the first season of the current layout, so lap records from an older,
 * different track aren't shown. Keyed by Jolpica circuitId. Everything else comes from the APIs.
 */
export const CIRCUIT_FACTS = {
  albert_park: { layoutSince: 2022, lengthKm: 5.278, corners: 14 },
  shanghai: { lengthKm: 5.451, corners: 16 },
  suzuka: { lengthKm: 5.807, corners: 18 },
  miami: { layoutSince: 2022, lengthKm: 5.412, corners: 19 },
  villeneuve: { lengthKm: 4.361, corners: 14 },
  monaco: { lengthKm: 3.337, corners: 19 },
  catalunya: { layoutSince: 2023, lengthKm: 4.657, corners: 14 },
  red_bull_ring: { layoutSince: 2014, lengthKm: 4.318, corners: 10 },
  silverstone: { layoutSince: 2010, lengthKm: 5.891, corners: 18 },
  spa: { layoutSince: 2007, lengthKm: 7.004, corners: 19 },
  hungaroring: { layoutSince: 2003, lengthKm: 4.381, corners: 14 },
  zandvoort: { layoutSince: 2021, lengthKm: 4.259, corners: 14 },
  monza: { lengthKm: 5.793, corners: 11 },
  madring: { layoutSince: 2026, lengthKm: 5.474, corners: 22 },
  baku: { lengthKm: 6.003, corners: 20 },
  sepang: { lengthKm: 5.543, corners: 15 },
  marina_bay: { layoutSince: 2023, lengthKm: 4.94, corners: 19 },
  americas: { layoutSince: 2012, lengthKm: 5.513, corners: 20 },
  rodriguez: { layoutSince: 2015, lengthKm: 4.304, corners: 17 },
  interlagos: { lengthKm: 4.309, corners: 15 },
  vegas: { layoutSince: 2023, lengthKm: 6.201, corners: 17 },
  losail: { layoutSince: 2021, lengthKm: 5.419, corners: 16 },
  yas_marina: { layoutSince: 2021, lengthKm: 5.281, corners: 16 },
};

/** Parse "1:20.901" or "59.123" to seconds. */
export function lapTimeToSeconds(t) {
  if (!t) return null;
  const parts = String(t).split(':').map(Number);
  return parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
}

/** Fastest race lap on the current layout in Jolpica's data (fastest laps are logged from 2004). */
export function lapRecordFrom(races, layoutSince = 0) {
  let best = null;
  for (const r of races) {
    if (Number(r.season) < layoutSince) continue;
    const res = r.Results?.[0];
    const time = res?.FastestLap?.Time?.time;
    const sec = lapTimeToSeconds(time);
    if (sec && (!best || sec < best.seconds)) {
      best = { time, seconds: sec, season: Number(r.season), driver: `${res.Driver.givenName} ${res.Driver.familyName}` };
    }
  }
  return best;
}

/** The most recent winner at the circuit before the given season. */
export function lastWinnerFrom(races, beforeSeason) {
  const prior = races.filter((r) => Number(r.season) < beforeSeason).sort((a, b) => Number(a.season) - Number(b.season));
  const last = prior.at(-1);
  const res = last?.Results?.[0];
  return res
    ? { season: Number(last.season), driver: `${res.Driver.givenName} ${res.Driver.familyName}`, team: res.Constructor.name, laps: Number(res.laps) || null }
    : null;
}

/** Ramer–Douglas–Peucker line simplification on [x, y, t] points. */
export function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const sqTol = tolerance * tolerance;
  const sqSegDist = (p, a, b) => {
    let [x, y] = a;
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx || dy) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { [x, y] = b; } else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxD = 0;
    let idx = 0;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > sqTol) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * Turn OpenF1 /location rows for one lap into an outline that fits a 1000-unit box.
 * Each point is [x, y, t] where t is the fraction of the lap (0..1) when the car was there,
 * so the dot on the map can move at the car's real speed.
 * `pitRows` (optional, same session) are drawn in the same frame as `pitLane: [[x, y], …]`.
 */
export function buildOutline(rows, { size = 1000, pad = 40, tolerance = 2, pitRows = null } = {}) {
  const clean = (list) => (list ?? []).filter((r) => r.x != null && r.y != null && !(r.x === 0 && r.y === 0));
  const pts = clean(rows);
  const pit = clean(pitRows);
  if (pts.length < 10) return null;
  const t0 = Date.parse(pts[0].date);
  const t1 = Date.parse(pts.at(-1).date);
  const all = [...pts, ...pit];
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = (size - pad * 2) / Math.max(maxX - minX, maxY - minY);
  const w = (maxX - minX) * scale + pad * 2;
  const h = (maxY - minY) * scale + pad * 2;
  // Screen y grows downwards, track y grows upwards.
  const project = (p) => [Math.round((p.x - minX) * scale + pad), Math.round((maxY - p.y) * scale + pad)];
  const raw = pts.map((p) => [...project(p), Number(((Date.parse(p.date) - t0) / Math.max(1, t1 - t0)).toFixed(4))]);
  const out = { width: Math.round(w), height: Math.round(h), points: simplify(raw, tolerance) };
  if (pit.length >= 5) {
    const lane = simplify(pit.map((p) => [...project(p), 0]), tolerance).map(([x, y]) => [x, y]);
    // Snap each end onto the nearest point of the circuit so the pit lane visibly joins the track.
    const nearest = ([x, y]) => out.points.reduce((best, q) => (Math.hypot(q[0] - x, q[1] - y) < Math.hypot(best[0] - x, best[1] - y) ? q : best));
    const snap = (end) => {
      const q = nearest(end);
      return Math.hypot(q[0] - end[0], q[1] - end[1]) <= 160 ? [q[0], q[1]] : null;
    };
    const head = snap(lane[0]);
    const tail = snap(lane.at(-1));
    out.pitLane = [...(head ? [head] : []), ...lane, ...(tail ? [tail] : [])];
  }
  return out;
}

// OpenF1 x/y are in decimetres. The pit limiter is 80 km/h (~222 dm/s); 300 leaves headroom
// for entry/exit while staying far below racing speed.
const PIT_SPEED_DM_S = 300;

/**
 * Find the pit lane in a car's position trace around a pit stop: the longest stretch where the car
 * is at or below pit-limiter speed. Returns the matching rows, or null if nothing plausible is found.
 */
export function findPitLane(rows, { maxSpeed = PIT_SPEED_DM_S, lapRows = null, joinDm = 70, maxExtendS = 25, maxOffsetDm = 1500 } = {}) {
  const pts = (rows ?? []).filter((r) => !(r.x === 0 && r.y === 0) && r.date);
  if (pts.length < 10) return null;
  const t = pts.map((r) => Date.parse(r.date));
  // Speed over a 5-sample window smooths GPS jitter.
  const speed = pts.map((_, i) => {
    const a = Math.max(0, i - 2);
    const b = Math.min(pts.length - 1, i + 2);
    return Math.hypot(pts[b].x - pts[a].x, pts[b].y - pts[a].y) / Math.max(0.001, (t[b] - t[a]) / 1000);
  });
  let best = null;
  let start = null;
  for (let i = 0; i <= speed.length; i++) {
    const slow = i < speed.length && speed[i] < maxSpeed;
    if (slow && start === null) start = i;
    if (!slow && start !== null) {
      const dur = (t[i - 1] - t[start]) / 1000;
      if (!best || dur > best.dur) best = { start, end: i - 1, dur };
      start = null;
    }
  }
  if (!best) return null;
  let first = Math.max(0, best.start - 2);
  let last = Math.min(pts.length - 1, best.end + 2);
  // Extend both ends along the pit entry/exit roads until the car is back on the racing line
  // (within joinDm of the lap trace), so the drawn pit lane meets the circuit.
  const lap = (lapRows ?? []).filter((r) => !(r.x === 0 && r.y === 0));
  if (lap.length) {
    const offLine = (p) => {
      let min = Infinity;
      for (const q of lap) {
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < min) min = d;
      }
      return min > joinDm;
    };
    while (first > 0 && offLine(pts[first]) && (t[best.start] - t[first - 1]) / 1000 <= maxExtendS) first--;
    while (last < pts.length - 1 && offLine(pts[last]) && (t[last + 1] - t[best.end]) / 1000 <= maxExtendS) last++;
  }
  const run = pts.slice(first, last + 1);
  // A real pit lane runs alongside the circuit. If the trace strays far away, it's a bad GPS
  // feed (or the car went to the garage), so reject it and let the caller try another stop.
  if (lap.length) {
    const maxOff = Math.max(...run.map((p) => Math.min(...lap.map((q) => Math.hypot(p.x - q.x, p.y - q.y)))));
    if (maxOff > maxOffsetDm) return null;
  }
  const lengthM = run.reduce((n, p, i) => n + (i ? Math.hypot(p.x - run[i - 1].x, p.y - run[i - 1].y) : 0), 0) / 10;
  // A pit lane takes ~12–60s and is a few hundred metres long; anything else is a slow corner or a stop on track.
  if (best.dur < 10 || best.dur > 70 || lengthM < 150 || lengthM > 2500) return null;
  return run;
}

/** Pick the fastest clean lap in an OpenF1 /laps list. */
export function fastestLap(laps) {
  return laps
    .filter((l) => l.lap_duration && !l.is_pit_out_lap && l.date_start)
    .sort((a, b) => a.lap_duration - b.lap_duration)[0] ?? null;
}

/** Enough distinct positions to be a real, complete lap (guards against frozen GPS feeds). */
export function outlineLooksValid(rows, outline) {
  if (!outline) return false;
  const distinct = new Set(rows.map((r) => `${r.x},${r.y}`)).size;
  return distinct >= 120 && outline.points.length >= 30;
}

/** Position trace of one ordinary pit stop in the session, trimmed to the pit lane. */
async function pitLaneRows(session, lapRows, getJSONImpl, log) {
  const pits = await getJSONImpl(`${OPENF1}/pit?session_key=${session.session_key}`);
  const normal = pits.filter((p) => p.lane_duration > 12 && p.lane_duration < 45 && p.date);
  const median = normal.map((p) => p.lane_duration).sort((a, b) => a - b)[Math.floor(normal.length / 2)];
  const candidates = normal.sort((a, b) => Math.abs(a.lane_duration - median) - Math.abs(b.lane_duration - median)).slice(0, 8);
  for (const p of candidates) {
    // OpenF1's pit timestamp is at the pit exit, so look back over the lane time plus a margin.
    const exit = Date.parse(p.date);
    const from = new Date(exit - (p.lane_duration + 35) * 1000);
    const to = new Date(exit + 25000);
    const q = new URLSearchParams({ session_key: session.session_key, driver_number: p.driver_number });
    try {
      const rows = await getJSONImpl(`${OPENF1}/location?${q}&date>=${encodeURIComponent(from.toISOString())}&date<${encodeURIComponent(to.toISOString())}`);
      const lane = findPitLane(rows, { lapRows });
      if (lane) return lane;
      log(`    pit lap ${p.lap_number} #${p.driver_number}: no clear pit lane in trace, trying next`);
    } catch (err) {
      log(`    pit lap ${p.lap_number} #${p.driver_number}: ${err.message}, trying next`);
    }
  }
  return null;
}

/**
 * Try the fastest few clean laps in a session until one gives a usable outline.
 * `pitFallbacks` are other sessions at the same circuit (OpenF1 uses the same coordinate frame
 * across years) to borrow a pit lane trace from when this session's pit-lane GPS drops out,
 * as it does under the pit building at Shanghai.
 */
async function outlineForSession(session, getJSONImpl, log, pitFallbacks = []) {
  const laps = await getJSONImpl(`${OPENF1}/laps?session_key=${session.session_key}`);
  const candidates = laps
    .filter((l) => l.lap_duration && !l.is_pit_out_lap && l.date_start)
    .sort((a, b) => a.lap_duration - b.lap_duration)
    .slice(0, 6);
  for (const lap of candidates) {
    const start = new Date(lap.date_start);
    const end = new Date(start.getTime() + lap.lap_duration * 1000);
    const q = new URLSearchParams({ session_key: session.session_key, driver_number: lap.driver_number });
    const url = `${OPENF1}/location?${q}&date>=${encodeURIComponent(start.toISOString())}&date<${encodeURIComponent(end.toISOString())}`;
    try {
      const rows = await getJSONImpl(url);
      const outline = buildOutline(rows);
      if (outlineLooksValid(rows, outline)) {
        let pitRows = await pitLaneRows(session, rows, getJSONImpl, log);
        let pitSource = pitRows ? { year: session.year, session: session.session_name } : null;
        for (const other of pitFallbacks) {
          if (pitRows) break;
          log(`    trying pit lane from ${other.year} ${other.session_name}`);
          // findPitLane checks the trace against this lap, so a misaligned session is rejected.
          pitRows = await pitLaneRows(other, rows, getJSONImpl, log);
          if (pitRows) pitSource = { year: other.year, session: other.session_name };
        }
        if (!pitRows) log('    no pit lane found');
        const withPit = pitRows ? buildOutline(rows, { pitRows }) : outline;
        return { ...withPit, ...(pitSource && { pitSource }), lapSeconds: lap.lap_duration, year: session.year, driverNumber: lap.driver_number };
      }
      log(`    lap ${lap.lap_number} #${lap.driver_number}: position data incomplete, trying next`);
    } catch (err) {
      log(`    lap ${lap.lap_number} #${lap.driver_number}: ${err.message}, trying next`);
    }
  }
  return null;
}

/**
 * Build circuits.json: facts, last winner before this season, fastest-ever race lap, and an outline.
 * Outlines come from this season's race at the circuit, or last year's if it hasn't run yet.
 */
export async function buildCircuits(season, { getJSONImpl = getJSON, log = () => {} } = {}) {
  const thisYear = await getJSONImpl(`${OPENF1}/sessions?year=${season.season}&session_name=Race`);
  const lastYear = await getJSONImpl(`${OPENF1}/sessions?year=${season.season - 1}&session_name=Race`);
  const out = {};
  for (const race of season.races) {
    const id = race.circuitId;
    if (out[id]) continue;
    log(`  ${race.circuitName}`);
    const winners = (await getJSONImpl(`${JOLPICA}/circuits/${id}/results/1/?limit=100`)).MRData.RaceTable.Races;
    const fastest = (await getJSONImpl(`${JOLPICA}/circuits/${id}/fastest/1/results/?limit=100`)).MRData.RaceTable.Races;

    let outline = null;
    const current = matchSession(thisYear, 'Race', race.start);
    const prev = current && lastYear.find((s) => s.circuit_short_name === current.circuit_short_name);
    if (current && race.status === 'completed') outline = await outlineForSession(current, getJSONImpl, log, prev ? [prev] : []);
    if (!outline && prev) outline = await outlineForSession(prev, getJSONImpl, log);
    if (!outline) log('    no usable outline');

    out[id] = {
      id,
      name: race.circuitName,
      ...CIRCUIT_FACTS[id],
      lastWinner: lastWinnerFrom(winners, season.season),
      firstGrandPrix: winners.length ? Math.min(...winners.map((r) => Number(r.season))) : null,
      lapRecord: lapRecordFrom(fastest, CIRCUIT_FACTS[id]?.layoutSince),
      outline,
    };
  }
  return { season: season.season, generatedAt: new Date().toISOString(), circuits: out };
}

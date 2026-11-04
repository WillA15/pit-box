// Pure schedule helpers.
const RACE_LENGTH_MS = 3 * 60 * 60 * 1000;

/** The next race that hasn't finished (a race counts as live for 3h after lights out). */
export function nextRace(races, now = new Date()) {
  return races.find((r) => Date.parse(r.start) + RACE_LENGTH_MS > now.getTime() && r.status !== 'completed') ?? null;
}

export function raceState(race, now = new Date()) {
  if (race.status === 'completed') return 'completed';
  const start = Date.parse(race.sessions[0]?.start ?? race.start);
  const end = Date.parse(race.start) + RACE_LENGTH_MS;
  if (now.getTime() >= start && now.getTime() < end) return 'live';
  if (now.getTime() >= end) return 'awaiting-results';
  return 'upcoming';
}

export const FILTERS = {
  all: () => true,
  upcoming: (r) => r.status !== 'completed',
  completed: (r) => r.status === 'completed',
  sprint: (r) => r.sprint,
};

export function podium(race) {
  return race.results.filter((r) => r.pos && r.pos <= 3).sort((a, b) => a.pos - b.pos);
}

/** Split a duration into days/hours/minutes/seconds (never negative). */
export function countdownParts(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

export function weekendRange(race, locale, timeZone) {
  const first = new Date(race.sessions[0]?.start ?? race.start);
  const last = new Date(race.start);
  const fmt = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone });
  const a = fmt.format(first);
  const b = fmt.format(last);
  return a === b ? a : `${a} – ${b}`;
}

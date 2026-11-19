// How many of the five start lights the landing hero shows for the next race.
const DAY = 24 * 60 * 60 * 1000;
const RACE_LENGTH_MS = 3 * 60 * 60 * 1000;

/**
 * Lights 1–4 fill across the gap since the previous race (one comes on just after it), and the
 * fifth only comes on in the last 24 hours, so "all five" always means race day.
 * Once the race starts the lights go out, as they do at a real start.
 * @returns {{ lit: number, phase: 'waiting' | 'out' | 'done' }}
 */
export function raceLights(races, race, now) {
  if (!race) return { lit: 0, phase: 'done' };
  const start = Date.parse(race.start);
  if (now >= start && now < start + RACE_LENGTH_MS) return { lit: 0, phase: 'out' };
  const prev = races.find((r) => r.round === race.round - 1);
  const from = prev ? Date.parse(prev.start) : start - 14 * DAY;
  if (start - now <= DAY) return { lit: 5, phase: 'waiting' };
  const span = Math.max(start - DAY - from, DAY);
  const progress = Math.min(Math.max((now - from) / span, 0), 1);
  return { lit: Math.min(4, Math.max(1, Math.ceil(progress * 4))), phase: 'waiting' };
}

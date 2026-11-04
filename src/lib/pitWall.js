// Summaries for the My Pit Wall dashboard (pure, testable).
import { rankNewsForDriver } from './news.js';
import { TEAM_NEWS_NAMES } from './teams.js';

const CLASSIFIED = /^\d+$/;

/** A driver's most recent Grand Prix, last five finishes and points after each round. */
export function driverSummary(season, history, driverId) {
  const standing = season.driverStandings.find((s) => s.driverId === driverId) ?? null;
  const races = season.races.filter((r) => r.results.some((x) => x.driverId === driverId));
  const last = races.at(-1);
  const latest = last && last.results.find((x) => x.driverId === driverId);
  const recent = races.slice(-5).map((r) => {
    const res = r.results.find((x) => x.driverId === driverId);
    return { round: r.round, name: r.name, country: r.country, pos: res.pos, label: CLASSIFIED.test(res.positionText) ? `P${res.pos}` : 'DNF' };
  });
  const trend = history.rounds.map((round) => ({ round, points: history.drivers[round].find((x) => x.id === driverId)?.points ?? 0 }));
  return {
    id: driverId,
    standing,
    latest: latest && {
      round: last.round,
      name: last.name,
      country: last.country,
      label: CLASSIFIED.test(latest.positionText) ? `P${latest.pos}` : 'DNF',
      status: latest.status,
      grid: latest.grid,
      gained: CLASSIFIED.test(latest.positionText) && latest.grid ? latest.grid - latest.pos : null,
      points: latest.points,
    },
    recent,
    trend,
    lastRoundPoints: trend.length > 1 ? trend.at(-1).points - trend.at(-2).points : trend.at(-1)?.points ?? 0,
  };
}

/** A team's championship position, latest race for both cars, and points trend. */
export function teamSummary(season, history, constructorId) {
  const standing = season.constructorStandings.find((s) => s.constructorId === constructorId) ?? null;
  const races = season.races.filter((r) => r.results.some((x) => x.constructorId === constructorId));
  const last = races.at(-1);
  const cars = last
    ? last.results
        .filter((x) => x.constructorId === constructorId)
        .map((x) => ({ driverId: x.driverId, label: CLASSIFIED.test(x.positionText) ? `P${x.pos}` : 'DNF', points: x.points }))
    : [];
  const trend = history.rounds.map((round) => ({ round, points: history.constructors[round].find((x) => x.id === constructorId)?.points ?? 0 }));
  return {
    id: constructorId,
    standing,
    latest: last && { round: last.round, name: last.name, country: last.country, cars, points: cars.reduce((n, c) => n + c.points, 0) },
    trend,
  };
}

/**
 * Top stories across everything the user follows. Each story says who it's about; a story
 * that mentions several followed drivers/teams appears once, with all of them listed.
 */
export function pitWallNews(items, season, follows, { now = new Date(), limit = 6 } = {}) {
  const byLink = new Map();
  const add = (stories, label) => {
    for (const s of stories) {
      const prev = byLink.get(s.lead.link);
      if (prev) {
        prev.about = [...new Set([...prev.about, label])];
        prev.score = Math.max(prev.score, s.score);
      } else {
        byLink.set(s.lead.link, { ...s, about: [label] });
      }
    }
  };
  for (const id of follows.drivers) {
    const d = season.drivers[id];
    if (!d) continue;
    const teamName = TEAM_NEWS_NAMES[d.constructorId] ?? season.constructors[d.constructorId]?.name;
    add(rankNewsForDriver(items, d, { teamName, now, limit: 5 }), d.familyName);
  }
  for (const id of follows.teams) {
    const name = TEAM_NEWS_NAMES[id] ?? season.constructors[id]?.name;
    if (!name) continue;
    add(rankNewsForDriver(items, { givenName: '', familyName: name }, { now, limit: 5 }), name);
  }
  return [...byLink.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

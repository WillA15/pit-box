// Search for the Drivers page: match a few typed letters against driver names, codes, numbers
// and team names, and rank the best matches first.
import { teamShortName } from './teams.js';
import { normalize, words, scoreQuery, rankBy } from './search.js';

export { normalize };

// Extra names people type for a team, beyond its short and official names.
const TEAM_ALIASES = {
  rb: ['Racing Bulls', 'VCARB', 'Visa Cash App'],
  red_bull: ['Red Bull Racing', 'RBR'],
  aston_martin: ['Aston', 'AMR'],
  mercedes: ['Merc', 'AMG'],
  audi: ['Sauber', 'Kick Sauber'],
};

/** Everything a driver can be found by, normalized once. */
function searchFields(d, season) {
  const team = teamShortName(d.constructorId, season.constructors[d.constructorId]?.name);
  const teamNames = [team, season.constructors[d.constructorId]?.name, ...(TEAM_ALIASES[d.constructorId] ?? [])]
    .filter(Boolean)
    .map(normalize);
  return {
    family: normalize(d.familyName),
    given: normalize(d.givenName),
    full: normalize(`${d.givenName} ${d.familyName}`),
    code: normalize(d.code),
    number: d.number == null ? '' : String(d.number),
    teams: [...new Set(teamNames)],
  };
}

// Higher is a better match. 0 means no match.
function scoreToken(q, f) {
  if (!q) return 0;
  if (f.family === q || f.full === q || f.code === q || f.number === q) return 100;
  if (f.family.startsWith(q)) return 90;
  if (f.given.startsWith(q)) return 80;
  if (f.full.startsWith(q)) return 78;
  if (words(f.full).some((w) => w.startsWith(q))) return 72;
  if (f.code.startsWith(q)) return 65;
  if (f.number.startsWith(q)) return 60;
  if (f.teams.some((t) => t === q)) return 58;
  if (f.teams.some((t) => t.startsWith(q))) return 55;
  if (f.teams.some((t) => words(t).some((w) => w.startsWith(q)))) return 50;
  if (q.length >= 3 && f.full.includes(q)) return 40;
  if (q.length >= 3 && f.teams.some((t) => t.includes(q))) return 30;
  return 0;
}

/** How well one driver matches the query, or 0 if it doesn't. */
export function matchScore(d, season, query) {
  const f = searchFields(d, season);
  return scoreQuery(query, (q) => scoreToken(q, f));
}

/**
 * The drivers that match, best first. Equal matches keep their order in the list given
 * (the championship order on the Drivers page). An empty query returns the list unchanged.
 */
export function searchDrivers(list, season, query) {
  return rankBy(list, query, (d) => matchScore(d, season, query));
}

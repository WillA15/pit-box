// Search for the Tracks page: match a few typed letters against the race, circuit, city and
// country, the round number, and who won there, and rank the best matches first.
import { podium } from './schedule.js';
import { teamShortName } from './teams.js';
import { normalize, wordStarts, scoreQuery, rankBy } from './search.js';

// Other names people type for a country.
const COUNTRY_ALIASES = {
  USA: ['United States', 'America', 'US'],
  UK: ['United Kingdom', 'Great Britain', 'Britain', 'England'],
  UAE: ['United Arab Emirates', 'Emirates'],
  Netherlands: ['Holland'],
};

// Nicknames for circuits that aren't already in their official names.
const CIRCUIT_ALIASES = {
  americas: ['COTA'],
  interlagos: ['Interlagos'],
  rodriguez: ['Hermanos Rodriguez'],
  vegas: ['Vegas Strip'],
  losail: ['Losail'],
  marina_bay: ['Singapore street circuit'],
  catalunya: ['Catalonia'],
};

/** Everything a race weekend can be found by, normalized once. */
function searchFields(race, season) {
  const winner = podium(race)[0];
  const driver = winner && season.drivers[winner.driverId];
  return {
    name: normalize(race.name),
    circuit: normalize(race.circuitName),
    locality: normalize(race.locality),
    country: normalize(race.country),
    places: [race.name, race.circuitName, race.locality, race.country, ...(COUNTRY_ALIASES[race.country] ?? []), ...(CIRCUIT_ALIASES[race.circuitId] ?? [])].map(normalize),
    round: String(race.round),
    sprint: race.sprint,
    winner: driver ? [driver.familyName, `${driver.givenName} ${driver.familyName}`, driver.code].map(normalize) : [],
    winnerTeam: winner ? normalize(teamShortName(winner.constructorId, season.constructors[winner.constructorId]?.name)) : '',
  };
}

// Higher is a better match. 0 means no match.
function scoreToken(q, f) {
  if (!q) return 0;
  const round = q.replace(/^(r|round) ?/, '');
  if (/^\d+$/.test(round) && round === f.round) return 100;
  if ([f.name, f.circuit, f.locality, f.country].includes(q)) return 100;
  if (f.name.startsWith(q)) return 90;
  if (f.locality.startsWith(q)) return 86;
  if (f.country.startsWith(q)) return 84;
  if (f.circuit.startsWith(q)) return 80;
  if (wordStarts(f.places, q)) return 72;
  if (/^\d+$/.test(round) && f.round.startsWith(round)) return 60;
  if (f.sprint && 'sprint'.startsWith(q) && q.length >= 3) return 58;
  if (f.winner.some((w) => w === q)) return 56;
  if (wordStarts(f.winner, q)) return 52;
  if (f.winnerTeam && (f.winnerTeam === q || wordStarts([f.winnerTeam], q))) return 45;
  // Mid-word matches need 4+ letters, or "usa" would find Lusail.
  if (q.length >= 4 && f.places.some((p) => p.includes(q))) return 40;
  return 0;
}

/** How well one race weekend matches the query, or 0 if it doesn't. */
export function trackScore(race, season, query) {
  const f = searchFields(race, season);
  return scoreQuery(query, (q) => scoreToken(q, f));
}

/** The race weekends that match, best first; equal matches stay in calendar order. */
export function searchTracks(races, season, query) {
  return rankBy(races, query, (r) => trackScore(r, season, query));
}

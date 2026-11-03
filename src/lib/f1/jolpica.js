import { getJSON } from './http.js';

export const JOLPICA = 'https://api.jolpi.ca/ergast/f1';

/**
 * Fetch every page of a Jolpica race-table endpoint (results, sprint, qualifying, pitstops).
 * Jolpica pages by result row, so one race can be split across pages; rows are merged by round.
 */
export async function jolpicaRaces(path, rowKey, { getJSONImpl = getJSON } = {}) {
  const limit = 100;
  const byRound = new Map();
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const data = await getJSONImpl(`${JOLPICA}/${path}/?limit=${limit}&offset=${offset}`);
    const mr = data.MRData;
    total = Number(mr.total);
    for (const race of mr.RaceTable.Races) {
      const existing = byRound.get(race.round);
      if (existing) {
        if (rowKey) existing[rowKey] = [...(existing[rowKey] ?? []), ...(race[rowKey] ?? [])];
      } else {
        byRound.set(race.round, { ...race });
      }
    }
    offset += limit;
    if (!mr.RaceTable.Races.length) break;
  }
  return [...byRound.values()].sort((a, b) => Number(a.round) - Number(b.round));
}

export async function jolpicaStandings(season, kind, { getJSONImpl = getJSON } = {}) {
  const data = await getJSONImpl(`${JOLPICA}/${season}/${kind}standings/?limit=100`);
  const list = data.MRData.StandingsTable.StandingsLists[0];
  return list ? { round: Number(list.round), rows: list[kind === 'driver' ? 'DriverStandings' : 'ConstructorStandings'] } : { round: 0, rows: [] };
}

import { getJSON } from './http.js';
import { JOLPICA } from './jolpica.js';

const total = async (getJSONImpl, path) => Number((await getJSONImpl(`${JOLPICA}/${path}/?limit=1`)).MRData.total);

/**
 * Career totals for every driver in the season, from Jolpica. Includes the current season so far.
 * Titles only count completed seasons, plus the current one if it's mathematically decided
 * (pass `clinchedChampionId`).
 */
export async function buildCareers(season, { getJSONImpl = getJSON, clinchedChampionId = null, log = () => {} } = {}) {
  const out = {};
  const seasonsById = {};
  for (const id of Object.keys(season.drivers)) {
    seasonsById[id] = (await getJSONImpl(`${JOLPICA}/drivers/${id}/seasons/?limit=100`)).MRData.SeasonTable.Seasons.map((s) => Number(s.season));
  }
  // Jolpica needs a year for standings queries, so look up each past champion once.
  const years = [...new Set(Object.values(seasonsById).flat())].filter((y) => y < season.season).sort();
  const championOf = {};
  for (const y of years) {
    const list = (await getJSONImpl(`${JOLPICA}/${y}/driverstandings/1/`)).MRData.StandingsTable.StandingsLists[0];
    championOf[y] = list?.DriverStandings?.[0]?.Driver?.driverId ?? null;
  }
  if (clinchedChampionId) championOf[season.season] = clinchedChampionId;
  for (const id of Object.keys(season.drivers)) {
    log(`  ${id}`);
    const starts = await total(getJSONImpl, `drivers/${id}/results`);
    const wins = await total(getJSONImpl, `drivers/${id}/results/1`);
    const p2 = await total(getJSONImpl, `drivers/${id}/results/2`);
    const p3 = await total(getJSONImpl, `drivers/${id}/results/3`);
    const poles = await total(getJSONImpl, `drivers/${id}/qualifying/1`);
    const seasons = seasonsById[id];
    const champs = Object.entries(championOf).filter(([, who]) => who === id).map(([y]) => Number(y)).sort();
    out[id] = {
      starts,
      wins,
      podiums: wins + p2 + p3,
      poles,
      titles: champs.length,
      titleYears: champs,
      firstSeason: seasons.length ? Math.min(...seasons) : null,
      seasons: seasons.length,
    };
  }
  return { season: season.season, generatedAt: new Date().toISOString(), careers: out };
}

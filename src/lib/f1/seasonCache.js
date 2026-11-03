import { buildSeason } from './buildSeason.js';

// Keeps a built season in memory for warm serverless instances (and the dev server).
const TTL_MS = 60 * 60 * 1000;
let cached = null;

export async function getSeasonCached(season = 2026) {
  if (cached && cached.season === season && Date.now() - cached.at < TTL_MS) return cached.promise;
  const promise = buildSeason(season);
  cached = { season, at: Date.now(), promise };
  promise.catch(() => { cached = null; });
  return promise;
}

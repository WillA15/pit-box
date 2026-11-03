import { getSeasonCached } from '../src/lib/f1/seasonCache.js';
import { buildRace } from '../src/lib/f1/buildRace.js';
import { sendJSON, queryOf } from './_respond.js';

export default async function handler(req, res) {
  const round = Number(queryOf(req).get('round'));
  if (!Number.isInteger(round) || round < 1 || round > 30) {
    return sendJSON(res, 400, { error: 'bad_round' });
  }
  try {
    const season = await getSeasonCached(2026);
    const race = await buildRace(season, round);
    sendJSON(res, 200, { ...race, source: 'live' });
  } catch (err) {
    sendJSON(res, 502, { error: 'upstream_failed', message: String(err.message ?? err) });
  }
}

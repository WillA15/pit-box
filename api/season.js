import { getSeasonCached } from '../src/lib/f1/seasonCache.js';
import { sendJSON } from './_respond.js';

export default async function handler(req, res) {
  try {
    const season = await getSeasonCached(2026);
    sendJSON(res, 200, { ...season, source: 'live' });
  } catch (err) {
    sendJSON(res, 502, { error: 'upstream_failed', message: String(err.message ?? err) });
  }
}

// Pulls the 2026 season from Jolpica + OpenF1 and writes the bundled fallback data.
//   npm run snapshot            -> season + every completed round
//   npm run snapshot -- 19 20   -> season + only those rounds
import { mkdir, writeFile } from 'node:fs/promises';
import { buildSeason } from '../src/lib/f1/buildSeason.js';
import { buildRace } from '../src/lib/f1/buildRace.js';

const OUT = new URL('../public/data/', import.meta.url);
const only = process.argv.slice(2).map(Number).filter(Boolean);

await mkdir(new URL('races/', OUT), { recursive: true });

console.log('Fetching season from Jolpica…');
const season = await buildSeason(2026);
await writeFile(new URL('season.json', OUT), JSON.stringify(season));
const done = season.races.filter((r) => r.status === 'completed' || r.sprintResults.length);
console.log(`season.json: ${season.races.length} rounds, ${done.length} with results`);

for (const race of done) {
  if (only.length && !only.includes(race.round)) continue;
  process.stdout.write(`Round ${race.round} ${race.name}… `);
  try {
    const detail = await buildRace(season, race.round);
    await writeFile(new URL(`races/${race.round}.json`, OUT), JSON.stringify(detail));
    console.log(`GP ${detail.grandPrix ? 'ok' : '—'}, sprint ${detail.sprint ? 'ok' : '—'}`);
  } catch (err) {
    console.log(`FAILED (${err.message}); keeping previous file if any`);
  }
}
console.log('Snapshot complete.');

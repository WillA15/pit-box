// Pulls the 2026 season from Jolpica + OpenF1 and writes the bundled fallback data.
//   npm run snapshot                 -> season, every completed round, circuits
//   npm run snapshot -- 19 20        -> season + only those rounds (circuits skipped)
//   npm run snapshot -- circuits     -> season + circuits only
import { mkdir, writeFile } from 'node:fs/promises';
import { buildSeason } from '../src/lib/f1/buildSeason.js';
import { buildRace } from '../src/lib/f1/buildRace.js';
import { buildCircuits } from '../src/lib/f1/circuits.js';

const OUT = new URL('../public/data/', import.meta.url);
const args = process.argv.slice(2);
const only = args.map(Number).filter(Boolean);
const circuitsOnly = args.includes('circuits');
const doRaces = !circuitsOnly;
const doCircuits = circuitsOnly || !only.length;

await mkdir(new URL('races/', OUT), { recursive: true });

console.log('Fetching season from Jolpica…');
const season = await buildSeason(2026);
await writeFile(new URL('season.json', OUT), JSON.stringify(season));
const done = season.races.filter((r) => r.status === 'completed' || r.sprintResults.length);
console.log(`season.json: ${season.races.length} rounds, ${done.length} with results`);

if (doRaces) {
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
}

if (doCircuits) {
  console.log('Building circuits (facts, records, outlines)…');
  const circuits = await buildCircuits(season, { log: console.log });
  await writeFile(new URL('circuits.json', OUT), JSON.stringify(circuits));
  const n = Object.values(circuits.circuits);
  console.log(`circuits.json: ${n.length} circuits, ${n.filter((c) => c.outline).length} with outlines`);
}
console.log('Snapshot complete.');

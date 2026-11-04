// Pulls the 2026 season from Jolpica + OpenF1 and writes the bundled fallback data.
//   npm run snapshot                 -> season, every completed round, circuits
//   npm run snapshot -- 19 20        -> season + only those rounds (circuits skipped)
//   npm run snapshot -- circuits     -> season + circuits only
//   npm run snapshot -- careers      -> season + career totals only
//   npm run snapshot -- news         -> news archive only (fast; run often)
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { buildSeason } from '../src/lib/f1/buildSeason.js';
import { buildRace } from '../src/lib/f1/buildRace.js';
import { buildCircuits } from '../src/lib/f1/circuits.js';
import { buildCareers } from '../src/lib/f1/careers.js';
import { fetchAllNews } from '../src/lib/f1/fetchNews.js';
import { mergeArchive } from '../src/lib/news.js';
import { computeStandingsHistory, championClinch } from '../src/lib/standingsHistory.js';

const OUT = new URL('../public/data/', import.meta.url);
const args = process.argv.slice(2);
const only = args.map(Number).filter(Boolean);
const modes = ['circuits', 'careers', 'news'].filter((m) => args.includes(m));
const everything = !modes.length && !only.length;
const doRaces = !modes.length;
const doCircuits = everything || modes.includes('circuits');
const doCareers = everything || modes.includes('careers');
const doNews = everything || modes.includes('news');

await mkdir(new URL('races/', OUT), { recursive: true });

if (doNews) {
  console.log('Fetching news feeds…');
  const fresh = await fetchAllNews();
  let archive = [];
  try { archive = JSON.parse(await readFile(new URL('news.json', OUT), 'utf8')).items ?? []; } catch { /* first run */ }
  const items = mergeArchive(archive, fresh.items);
  await writeFile(new URL('news.json', OUT), JSON.stringify({ generatedAt: fresh.generatedAt, feeds: fresh.feeds, items }));
  console.log(`news.json: ${items.length} articles (${fresh.items.length} fresh)`, fresh.feeds.filter((f) => f.error).map((f) => `${f.source}: ${f.error}`).join('; '));
  if (modes.length === 1) process.exit(0);
}

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
if (doCareers) {
  console.log('Building career totals…');
  const champ = championClinch(computeStandingsHistory(season.races), season.races, 'drivers');
  const careers = await buildCareers(season, { clinchedChampionId: champ?.id ?? null, log: () => process.stdout.write('.') });
  await writeFile(new URL('careers.json', OUT), JSON.stringify(careers));
  console.log(`\ncareers.json: ${Object.keys(careers.careers).length} drivers`);
}
console.log('Snapshot complete.');

// Shared expectations derived from the bundled snapshot, so tests keep working as rounds are added.
import { readFileSync } from 'node:fs';

const season = JSON.parse(readFileSync(new URL('../../public/data/season.json', import.meta.url), 'utf8'));
const completed = season.races.filter((r) => r.status === 'completed');
const upcoming = season.races.filter((r) => r.status !== 'completed');

export { season };
export const latest = completed[completed.length - 1];
export const next = upcoming[0];
export const completedCount = completed.length;
export const upcomingCount = upcoming.length;
export const raceCount = season.races.length;
export const driverCount = season.driverStandings.length;
export const constructorCount = season.constructorStandings.length;
export const sprintRounds = season.races.filter((r) => r.sprint);
export const completedSprints = sprintRounds.filter((r) => r.status === 'completed');
export const upcomingSprints = sprintRounds.filter((r) => r.status !== 'completed');
// A moment after the latest race and before the next weekend starts: the next race has a countdown.
export const NOW = new Date(new Date(latest.start).getTime() + 3 * 24 * 3600 * 1000).toISOString().replace('.000', '');
// Round 1 label shown on the round picker.
export const winnerId = latest.results[0].driverId;

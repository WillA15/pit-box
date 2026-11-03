import { loadSeason, loadRace } from './dataClient.js';
import { useAsync } from './useAsync.js';

export const useSeason = () => useAsync(loadSeason, []);
export const useRace = (round) => useAsync(() => loadRace(round), [round]);
